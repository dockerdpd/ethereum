pragma solidity ^0.4.24;

import "./TokenDMA.sol";
import "./NFTokenDMA.sol";
import "./AssetMap.sol";
import "./TokenUtil.sol";

/**
 * @dev This is an example contract implementation of Token.
 */
contract DMAPlatform {
  using SafeMath for uint256;
  using AssetMap for AssetMap.Data;
  using TokenUtil for uint256;

  // 上线资产表
  AssetMap.Data  approveMap;
  // 交易资产表
  AssetMap.Data  salesMap;

  // NFToken合约地址
  address internal token721;
  // ERC20合约地址
  address internal token20;

  enum AssetStatus { Online, SoldOut}

  event SaveApprove(
    address indexed _owner,
    uint256 indexed _tokenId,
    uint256 indexed _value
  );

  event RevokeApprove(
    address indexed _owner,
    uint256 indexed _tokenId,
    uint256 _count
  );

  event Transfer(
    address indexed _from,
    address indexed _to,
    uint256[] _array,
    uint256  _value
  );

  event IncCnt(
    address  _owner,
    uint256  _cnt
  );

  // 所有资产列表
  mapping (address => mapping(uint256 => uint256)) internal allAssets;
  mapping (address => uint256) internal assetCount;

  // 构造函数
  constructor(
    address  _token721,
    address  _token20
  )
    public
  {
    require(_token721 != address(0), "invalid erc721 address");
    require(_token20 != address(0), "invalid erc20 address");
    require(_token721 != _token20, "shoud diffirent between erc721 and erc20");
    token721 = _token721;
    token20 = _token20;
  }

  /**
   * @dev 保存授权信息
   * @param _tokenId      首个资产编号
   * @param _owner        资产所有者
   * @param _value        资产价值
   */
  function _saveApprove(
    address _owner,
    uint256 _tokenId,
    uint256 _value
  )
    internal
  {
    require(_owner != address(0), "invalid owner address");
    require(_value > 0, "value could more than 0");
    require(_tokenId > 0, "tokenId should more than 0");
    address tokenOwner = NFTokenDMA(token721).ownerOf(_tokenId);
    address approver = NFTokenDMA(token721).getApproved(_tokenId);
    bool isTransfer = NFTokenDMA(token721).getIsTransfer(_tokenId);
    require(isTransfer == true, "Assert can't be transfer");
    require(approver == address(this), "invalid approve address");
    require(tokenOwner == _owner, "invalid tokenId owner");
    require(tokenOwner == msg.sender, "invalid caller");
    allAssets[_owner][_tokenId] = _value;
    incAssetCnt(_owner);
    emit SaveApprove(_owner, _tokenId, _value);
  }

  /**
   *  @dev 以数组方式指定上线资产
   * @param _owner     资产所有者
   * @param _tokenArr   首个资产编号
   * @param _value     每份资产价值
   */
  function saveApproveWithArray(
    address     _owner,
    uint256[]   _tokenArr,
    uint256     _value
  )
    public
  {
    for (uint256 idx = 0; idx < _tokenArr.length; idx++) {
      _saveApprove(_owner, _tokenArr[idx], _value);
    }
  }

  /**
   * @dev 保存用户授权信息，支持同类多份资产，资产上线
   * @param _owner     资产所有者
   * @param _tokenId   首个资产编号
   * @param _count     资产数量(至少为1)
   * @param _value     每份资产价值
   */
  function saveMultiApprove(
    address _owner,
    uint256 _tokenId,
    uint256 _count,
    uint256 _value
  )
    public
  {
    require(_count > 0, "count should more than 0");
    uint256 startId = approveMap.nextTokenId(_tokenId);
    uint256[] memory r = startId.convert(_count);
    saveApproveWithArray(_owner, r, _value);
    approveMap.update(_tokenId, startId.add(_count));
  }

  /**
   * @dev  保存用户授权信息，资产上线
   * @param _owner     资产所有者
   * @param _tokenId   首个资产编号
   * @param _value     每份资产价值
   */
  function saveApprove(
    address _owner,
    uint256 _tokenId,
    uint256 _value
  )
    external
  {
    saveMultiApprove(_owner, _tokenId, 1, _value);
  }

 /**
   * @dev 获取某类上线资产的最后一个编号
   * @param    _tokenId   首个资产编号(作为资产标识)
   */
  function getLatestTokenId(
    uint256 _tokenId
  )
    external
    view
    returns (uint256 _tid)
  {
    _tid = approveMap.getLatestTokenId(_tokenId);
  }

  /**
   * @dev 获得某类资产下次开始交易的编号
   */
  function getLatestSalesTokenId(
    uint256 _tokenId
  )
    external
    view
    returns (uint256 _tid)
  {
    _tid = salesMap.getLatestTokenId(_tokenId);
  }

  /**
   * @dev 获取用户的授权信息
   * @param _tokenId    资产编号
   */
  function getApproveinfo(
    uint256 _tokenId
  )
    external
    view
    returns (address _owner, uint256 _tId, uint256 _value)
  {
    _owner = NFTokenDMA(token721).ownerOf(_tokenId);
    _value = allAssets[_owner][_tokenId];
    _tId = _tokenId;
  }

  /**
   * @dev 删除授权信息
   * @param _tokenArr    资产编号数组
   */
  function  revokeApprovesWithArray(
    uint256[] _tokenArr
  )
    public
  {
    for (uint256 idx = 0; idx < _tokenArr.length; idx++) {
      uint256 tid = _tokenArr[idx];
      address tokenOwner = NFTokenDMA(token721).ownerOf(tid);
      require(allAssets[tokenOwner][tid] > 0, "asset shoud exist");
      require(tokenOwner == msg.sender, "No permission");
      NFTokenDMA(token721).revokeApprove(tid);
      emit RevokeApprove(tokenOwner, tid, 1);
    }
    deleteApprove(tokenOwner, _tokenArr);
  }

  /**
   * @dev 删除授权信息
   * @param _tokenId    首个资产编号
   * @param _count      资产数量(至少1个)
   */
  function  revokeApprove(
    uint256 _tokenId,
    uint256 _count
  )
    external
  {
    require(_count > 0, "count should more than 0");
    uint256 lastId = approveMap.nextTokenId(_tokenId);
    require(lastId > 0 && lastId.sub(_tokenId) >= _count, "tokenId and count are invalid");
    uint256[] memory r = lastId.sub(_count).convert(_count);
    revokeApprovesWithArray(r);
    approveMap.update(_tokenId, lastId.sub(_count));
  }

  function checkTotalValueWithArray(
    address    _owner,
    uint256[]  _array,
    uint256    _totalValue
  )
    internal
    view
  {
    uint256 _value = 0;
    for (uint256 idx = 0; idx < _array.length; idx++) {
      uint256 tid = _array[idx];
      require(allAssets[_owner][tid] > 0, "asset with tid shoud exist");
      _value = _value.add(allAssets[_owner][tid]);
    }
    require(_totalValue >= _value, "invalid total value");
  }


  /**
   * @dev check total value
   * @param _tokenId      首个资产编号
   * @param _count        资产数量(至少1个)
   * @param _totalValue   资产总价
   */

  function checkTotalValue(
    address _owner,
    uint256 _tokenId,
    uint256 _count,
    uint256 _totalValue
  )
    internal
    view
  {
    require(_count > 0, "count should more than 0");
    require(_totalValue > 0, "total value should more than 0");
    uint256[] memory r = _tokenId.convert(_count);
    checkTotalValueWithArray(_owner, r, _totalValue);
  }

  /**
   * @dev  付款
   * @param   _tokenOwner    资产所有者
   * @param   _array         资产数组
   * @param   _value         资产总价
   */
  function tranferMoney(
    address   _tokenOwner,
    uint256[] _array,
    uint256   _value
  )
    internal
  {
    uint256 dmaApprove = TokenDMA(token20).freezeValue(msg.sender, address(this));
    require(dmaApprove >= _value, "no enough approve");
    TokenDMA(token20).transferFromFreeze(msg.sender, _tokenOwner, _value);
    deleteApprove(_tokenOwner, _array);
    emit Transfer(_tokenOwner, msg.sender, _array, _value);
  }

  /**
   * @dev 以指定数组进行交易
   * @param   _array      等交易资产数组
   * @param   _value      交易总金额
   */
  function transferWithArray(
    address     _owner,
    uint256[]   _array,
    uint256     _value
  )
    public
  {
    require(_array.length > 0, "array should not be empty");
    checkTotalValueWithArray(_owner, _array, _value);
    for (uint256 idx = 0; idx < _array.length; idx++) {
      uint256 tid = _array[idx];
      address tokenOwner = NFTokenDMA(token721).ownerOf(tid);
      require(tokenOwner == _owner, "assert owner is not matched.");
      require(allAssets[tokenOwner][tid] > 0, "asset shoud exist");
      address approver = NFTokenDMA(token721).getApproved(tid);
      require(approver == address(this), "no permission for 721 approve");
      NFTokenDMA(token721).safeTransferFrom(tokenOwner, msg.sender, tid);
    }
    tranferMoney(tokenOwner, _array, _value);
  }

  /**
   * @dev 根据传入信息进行匹配，完成 erc721 token 代币与 DMA 代币的交换
   * @param _tokenId  首个资产编号
   * @param _count    资产数量(至少1个)
   * @param _value    成交总价格
   */
  function transfer(
    address _owner,
    uint256 _tokenId,
    uint256 _count,
    uint256 _value
  )
    external
  {
    require(_count > 0, "count should more than 0");
    uint256 startId = salesMap.nextTokenId(_tokenId);
    uint256[] memory r = startId.convert(_count);
    transferWithArray(_owner, r, _value);
    salesMap.update(_tokenId, startId.add(_count));
  }

  /**
   * @dev delete an approve
   * @param _owner     资产所有者
   * @param _array     资产数组
   */
  function deleteApprove(
    address   _owner,
    uint256[] _array
  )
    internal
  {
    for (uint256 idx = 0; idx < _array.length; idx++) {
      uint256 tid = _array[idx];
      delete allAssets[_owner][tid];
      decAssetCnt(_owner);
    }
  }

  /**
   * get the count of asset for a user
   */

  function getAssetCnt(
    address _owner
  )
    external
    view
    returns (uint256 _cnt)
  {
    _cnt = assetCount[_owner];
  }

  /**
   * increase the count of assets for a user
   */
  function incAssetCnt(
    address _owner
  )
    internal
  {
    assetCount[_owner] = assetCount[_owner].add(1);
    emit IncCnt(_owner, assetCount[_owner]);
  }

  /**
   * decrease the count of assets for a user.
   */
  function decAssetCnt(
    address _owner
  )
    internal
  {
    assert(assetCount[_owner] > 0);
    assetCount[_owner] = assetCount[_owner].sub(1);
  }
}