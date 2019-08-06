pragma solidity ^0.4.24;

import "./TokenDMA.sol";
import "./NFTokenDMA.sol";
import "@0xcert/ethereum-utils/contracts/ownership/Ownable.sol";
import "@0xcert/ethereum-utils/contracts/math/SafeMath.sol";

contract PreSale is
  Ownable
  {
  using SafeMath for uint256;

  /**
   *  @dev contract address of token  721
   */
  address internal token721;

  /**
   *  @dev contract address of erc20
   */
  address internal token20;

  /**
   *  @dev end timestamp of pre-sale
   */
  uint internal endTimestamp;

  /**
   * struct of registed assets info
   * owner   资产发行者
   * amount  资产预售数量
   * value   资产预售单价
   * uri     资产URI
   */
  struct AssetInfo {
    address  owner;
    uint256  amount;
    uint256  value;
    string   uri;
  }

  // 资产注册信息
  mapping (uint256 => AssetInfo) internal registedAssets;

  // 资产定购数量统计
  mapping (uint256 => uint256)  internal  presaleStat;

  // 资产生成统计
  mapping (uint256 => uint256)  internal  lastMintId;

  /**
   * struct of order info
   * amount          购买数量
   * receiveAddress  接收地址
   */
  struct OrderInfo {
    uint256 amount;
    address receiveAddress;
  }

  mapping (address => mapping (uint256 => OrderInfo)) internal orders;

  /* 存储orders的键， 即所有定购者的地址 */
  mapping (uint256 => address[]) internal orderAddrs;

  modifier notFinished(){
    require(block.timestamp <= endTimestamp, "end-time is exceed");
    _;
  }

  modifier Finished(){
    require(block.timestamp > endTimestamp, "end-time is not exceed");
    _;
  }

  modifier canOrder(
    uint256 _tokenId,
    uint256 _amount
  ){
    require(block.timestamp <= endTimestamp
      && presaleStat[_tokenId].add(_amount) <= registedAssets[_tokenId].amount, "it should not exceed end-time and assert amount limit not exceed");
    _;
  }

  /**
   * construct function
   */
  constructor (
    address  _token721,
    address  _token20,
    uint  _endTimestamp
  )
    public
  {
    token721 = _token721;
    token20  = _token20;
    endTimestamp = _endTimestamp;
  }

  /**
   * @dev set end timestam (only for debug)
   * @param _newTimestamp  新的预售结束时间
   */
  function setEndTimestamp(
    uint _newTimestamp
  )
    external
    onlyOwner
  {
    endTimestamp = _newTimestamp;
  }

  /**
   * @dev get the end timestamp
   */
  function getEndTimeStamp(
  )
    external
    view
    returns (uint _btime, uint _endTime)
   {
    _btime = block.timestamp;
    _endTime = endTimestamp;
  }


  /**
   * @dev register asset type, it can't support be modified now
   * @param  _owner     资产所有者
   * @param  _tokenId   资产首个编号
   * @param  _amount    发行数量
   * @param  _value     资产单价
   * @param  _uri       资产URI
   */
  function registAsset(
    address  _owner,
    uint256  _tokenId,
    uint256  _amount,
    uint256  _value,
    string   _uri
  )
    external
    onlyOwner
  {
    require(_owner != address(0) && _tokenId > 0 && _amount > 0 && _value > 0 , "tokenId/amount/value all shoud more than 0");
    require(registedAssets[_tokenId].amount == 0, "Asset already registed");
    registedAssets[_tokenId] = AssetInfo(_owner, _amount, _value, _uri);
  }

  /**
   * @dev order, 下单
   * @param  _tokenId          资产类型
   * @param  _amount           购买数量
   * @param  _receiveAddress   接收者地址
   */
  function order(
    uint256 _tokenId,
    uint256 _amount,
    address _receiveAddress
  )
    external
    canOrder(_tokenId, _amount)
  {
    require(_tokenId > 0 && _amount > 0 && _receiveAddress != address(0), "invalie order parameters");
    require(registedAssets[_tokenId].amount > 0, "assert not registered");
    require(orders[msg.sender][_tokenId].amount == 0, "can't support multi order");
    uint256 fzValue = TokenDMA(token20).freezeValue(msg.sender, address(this));
    require(fzValue >= _amount.mul(registedAssets[_tokenId].value), "freeze value is not enough");
    orders[msg.sender][_tokenId] = OrderInfo(_amount, _receiveAddress);
    orderAddrs[_tokenId].push(msg.sender);
    presaleStat[_tokenId] = presaleStat[_tokenId].add(_amount);
  }

  /**
   * @dev refund，退款
   * @param _tokenId    资产类型
   * @param _amount     退票数量
   */
  function refund(
    uint256 _tokenId,
    uint256 _amount
  )
    external
    notFinished
  {
    require(_tokenId > 0 && _amount > 0, "invalid refund parameters");
    subOrDelOrderInfo(msg.sender, _tokenId, _amount);
    presaleStat[_tokenId] = presaleStat[_tokenId].sub(_amount);
    TokenDMA(token20).revokeApprove(msg.sender, _amount.mul(registedAssets[_tokenId].value));
  }

  /**
   * @dev 从定单地址数组中删除相关的记录
   * @param   _tokenId    资产ID
   * @param   _delAddress 要删除的购买者地址
   */
  function deleteFromOrderAddrs(
    uint256 _tokenId,
    address _delAddress
  )
    internal
  {
    uint indexToBeDeleted;
    uint len = orderAddrs[_tokenId].length;
    for (uint i = 0; i < len; i++) {
      if (orderAddrs[_tokenId][i] == _delAddress) {
        indexToBeDeleted = i;
        break;
      }
    }
    // if index to be deleted is not the last index, swap position.
    if (indexToBeDeleted < len-1) {
      orderAddrs[_tokenId][indexToBeDeleted] = orderAddrs[_tokenId][len-1];
    }
    // we can now reduce the array length by 1
    orderAddrs[_tokenId].length--;
  }

  /**
   * @dev 修改订单信息，在退票/mint时调用
   * @param   _payAddress 定购者地址
   * @param   _tokenId    资产ID
   * @param   _amount     退票数量
   */
  function subOrDelOrderInfo(
    address _payAddress,
    uint256 _tokenId,
    uint256 _amount
  )
    internal
  {
    require(orders[_payAddress][_tokenId].amount >= _amount, "refund amount is more than exists");
    orders[_payAddress][_tokenId].amount = orders[_payAddress][_tokenId].amount.sub(_amount);
    if(orders[_payAddress][_tokenId].amount == 0){
      delete orders[_payAddress][_tokenId];
      deleteFromOrderAddrs(_tokenId, _payAddress);
    }
  }

  /**
   * @dev getOrderInfo, 获取定购信息
   * @param  _payAddress   定购者地址
   * @param  _tokenId      资产ID
   */
  function getOrderInfo(
    address _payAddress,
    uint256 _tokenId
  )
    external
    view
    returns (address _add, uint256 _tId, uint256 _amount, address _receiveAddress)
  {
    _add = _payAddress;
    _tId = _tokenId;
    _amount  = orders[_payAddress][_tokenId].amount;
    _receiveAddress =  orders[_payAddress][_tokenId].receiveAddress;
  }

  /**
   * @dev get asset register info
   * @param _tokenId  资产ID
   */
  function getRegisterInfo(
    uint256 _tokenId
  )
    external
    view
    returns (address _owner, uint256 _tid, uint256 _amount, uint256 _val, string _uri, uint256 _orderCnt)
  {
    require(registedAssets[_tokenId].amount != 0, "Asset not registed");
    _tid = _tokenId;
    _owner = registedAssets[_tokenId].owner;
    _amount = registedAssets[_tokenId].amount;
    _val = registedAssets[_tokenId].value;
    _uri = registedAssets[_tokenId].uri;
    _orderCnt = presaleStat[_tokenId];
  }

  /**
   * @dev getOrderCount 获取某资产定购总量信息
   * @param _tokenId   资产ID
   */
  function getOrderCount(
    uint256 _tokenId
  )
    external
    view
    returns (uint256 _cnt)
  {
    _cnt = presaleStat[_tokenId];
  }

  /**
   * @dev 预售到期，完成资产的Mint和DMA代币的转移
   * @param    _tokenId     资产ID
   * @param    _payAddress  定购者地址
   */
  function _mintAsset(
    uint256 _tokenId,
    address _payAddress
  )
    internal
  {
    require(_payAddress != address(0), "invalid address");
    OrderInfo memory orderInfo = orders[_payAddress][_tokenId];
    require(orderInfo.amount > 0, "could not find order info");
    AssetInfo memory assetInfo = registedAssets[_tokenId];
    require(assetInfo.amount > 0, "could not find asset info");

    uint256 total = orderInfo.amount.mul(assetInfo.value);
    uint256 fzValue = TokenDMA(token20).freezeValue(_payAddress, address(this));
    require(fzValue >= total, "freeze value is not enough");

    NFTokenDMA(token721).mintMulti(orderInfo.receiveAddress, _tokenId, orderInfo.amount, assetInfo.uri, true, true);
    TokenDMA(token20).transferFromFreeze(_payAddress, assetInfo.owner, total);
    subOrDelOrderInfo(_payAddress, _tokenId, orderInfo.amount);
  }

  /**
   * @dev mint by the customer
   * @param  _tokenId    资产ID
   */
  function mintByCustomer(
    uint256 _tokenId
  )
    external
    Finished
  {
    _mintAsset(_tokenId, msg.sender);
  }

  /**
   * @dev mint by the platform
   * @param  _tokenId   资产ID
   * @param  _count     本次处理多少订单
   */
  function mintByPlatform(
    uint256 _tokenId,
    uint _count
  )
    external
    Finished
  {
    require(_count > 0, "empty loop");
    address[] memory arr = orderAddrs[_tokenId];
    uint len = _count <= arr.length ? _count : arr.length;

    for (uint idx = 0; idx < len; idx++) {
      address _pay = arr[idx];
      _mintAsset(_tokenId, _pay);
    }
  }
}