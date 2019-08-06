pragma solidity ^0.4.24;

import "./TokenDMA.sol";
import "./NFTokenDMA.sol";
import "@0xcert/ethereum-utils/contracts/ownership/Ownable.sol";
import "@0xcert/ethereum-utils/contracts/math/SafeMath.sol";

contract Nlucky is
  Ownable
{
  using SafeMath for uint256;

  /**
   *  address of 721 contract
   */
  address internal token721;

  /**
   * address of DMA token address
   */
  address internal  token20;

  /**
   *  the id of token to be auctioned
   */
  uint256 internal tokenId;

  /**
   * total portions
   */
  uint256  internal  totalPortions;

  /**
   * price of a portion
   */
  uint256  internal  price;

  /**
   * total portions
   */
  address[] internal  participants;
  address  internal   tokenOwner;
  address  internal   luckyAddress;
  uint256 internal    defaultCnt = 5;

  /**
   * store address and bet time
   */
  mapping (address => uint256) internal  betMap;

  /**
   *  end time
   */
  uint internal  endTimestamp;

  /**
   * have enough participants
   */
  bool internal isEnoughPartions;

  /**
   *  Auction is finished
   */
  bool  internal    isFinished;

  /**
   *  is transfered to luck user
   */
  bool internal     isTransfered;

  modifier notFinished(){
    require(!isFinished, "end-time is exceed");
    _;
  }

  modifier timeExceed(){
    require(block.timestamp > endTimestamp, "end-time is not exceed");
    _;
  }

  modifier lackPartion(){
    require(!isEnoughPartions, "not enough participants");
    _;
  }

  modifier canBet(
  ){
    require(block.timestamp <= endTimestamp
      && !isEnoughPartions
      && !isFinished, "it's finished or bid vlaue is less than current value");
    _;
  }

  constructor (
    address  _token721,
    address  _token20,
    uint256  _tokenId,
    uint256     _totalPortions,
    uint256     _price,
    uint     _endTimestamp
  )
    public
  {
    token721 = _token721;
    token20  = _token20;
    tokenId  = _tokenId;
    totalPortions = _totalPortions;
    price = _price;
    endTimestamp  = _endTimestamp;
    isFinished    = false;
    isEnoughPartions = false;
    isTransfered  = false;
  }

  /**
   * @dev set end timestam (only for debug)
   * @param _newTimestamp  拍卖结束时间
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
   * @dev get participants count
   */
  function getBetInfo()
    external
    view
    returns (uint _cnt, bool _isFinished, address _luckAddr)
  {
    _cnt = participants.length;
    _isFinished = isFinished;
    _luckAddr = luckyAddress;
  }

  /**
   * bet 投注
   */
  function bet()
    external
    canBet
  {
    uint256 freezeVal = TokenDMA(token20).freezeValue(msg.sender, address(this));
    uint256 cnt = betMap[msg.sender];
    require(freezeVal >= price.mul(cnt.add(1)), "freeze value of new adderss isn't enough");
    participants.push(msg.sender);
    betMap[msg.sender] = betMap[msg.sender].add(1);
    // 触发成功条件
    if(participants.length >= totalPortions){
      isEnoughPartions = true;
      success(defaultCnt);
    }
  }

  /**
   *  delete an address from participants array
   */
  function deleteFromParticipants(
    address  _delAddress
  )
    internal
  {
    uint indexToBeDeleted;
    uint len = participants.length;
    for (uint i = 0; i < len; i++) {
      if (participants[i] == _delAddress) {
        indexToBeDeleted = i;
        break;
      }
    }
    // if index to be deleted is not the last index, swap position.
    if (indexToBeDeleted < len-1) {
      participants[indexToBeDeleted] = participants[len-1];
    }
    // we can now reduce the array length by 1
    participants.length--;
    if(participants.length == 0){
      isFinished = true;
    }
  }

  /**
   * execute transfer action
   */
  function execTransfer(
    address _payAddress,
    uint256    _amount
  )
    internal
  {
    TokenDMA(token20).transferFromFreeze(_payAddress, tokenOwner, _amount);
  }

  /**
   * @dev refund
   * @param  _refundAddress  退款地址
   */
  function refund(
    address _refundAddress
  )
    internal
  {
    uint freezeVal = TokenDMA(token20).freezeValue(_refundAddress, address(this));
    if(freezeVal > 0){
      TokenDMA(token20).revokeApprove(_refundAddress, freezeVal);
    }
  }

  /**
   *  transfer the token Owner.
   */
  function transferOwner()
    internal
  {
      uint len = participants.length;
      uint luckIdx = getLuckIndex(len);
      require(luckIdx >= 0 && luckIdx < len, "invalide array index");
      luckyAddress = participants[luckIdx];
      tokenOwner = NFTokenDMA(token721).ownerOf(tokenId);
      address approvedAddr = NFTokenDMA(token721).getApproved(tokenId);
      require(approvedAddr == address(this), "invalid approve address");
      NFTokenDMA(token721).safeTransferFrom(tokenOwner, luckyAddress, tokenId);
      isTransfered = true;
  }

  /**
   * @dev success    执行转账任务
   * @param   _count    一次性转账数量
   */
  function success(
    uint _count
  )
    public
    notFinished
  {
    require(_count > 0, "loop count should more than 0");
    require(isEnoughPartions == true, "lack enough participants");
    if(!isTransfered){
      transferOwner();
    }

    uint l = _count < participants.length ? _count : participants.length;
    address[] memory addrs = new address[](l);
    for (uint idx = 0; idx < l; idx++) {
      addrs[idx] = participants[idx];
    }

    for (uint k = 0; k < addrs.length; k++) {
      execTransfer(addrs[k], price);
      deleteFromParticipants(addrs[k]);
    }
  }

  /**
   * @dev  fails 退款处理, 可多次调用
   * @param   _count     处理数量
   */
  function fails(
    uint _count
  )
    external
    timeExceed
    lackPartion
    notFinished
  {
    require(_count > 0, "loop count should more than 0");

    uint len = _count < participants.length ? _count : participants.length;
    address[] memory addrs = new address[](len);
    for (uint idx = 0; idx < len; idx++) {
      addrs[idx] = participants[idx];
    }

    for (uint k = 0; k < addrs.length; k++) {
      refund(addrs[k]);
      deleteFromParticipants(addrs[k]);
    }
  }

  /**
   * get random index from an array
   */
  function getLuckIndex(
    uint _length
  )
    internal
    view
    returns (uint _random)
  {
    _random = uint(keccak256(abi.encodePacked(now, msg.sender, block.timestamp))) % _length;
  }


  /**
   * @dev revoke token approve
   */
  function revokeToken()
    external
  {
    require(isFinished == true, "activity isn't game over");
    refund(msg.sender);
  }

}