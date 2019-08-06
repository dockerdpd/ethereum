pragma solidity ^0.4.24;

import "./TokenDMA.sol";
import "./NFTokenDMA.sol";
import "@0xcert/ethereum-utils/contracts/ownership/Ownable.sol";
import "@0xcert/ethereum-utils/contracts/math/SafeMath.sol";

contract Auction is
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
   *  the lowest value
   */
  uint  internal lowestValue;

  /**
   *  the highest value, 0 describe no limit
   */
  uint internal  closingValue;

  /**
   *  end time
   */
  uint internal  endTimestamp;

  /**
   *  address of the highest bid
   */
  address internal  currentAddress;

  /**
   *  highest bid value
   */
  uint  internal    currentValue;

  /**
   *  Auction is finished
   */
  bool  internal    isFinished;


  modifier notFinished(){
    require(!isFinished, "end-time is exceed");
    _;
  }

  modifier timeExceed(){
    require(block.timestamp > endTimestamp, "end-time is not exceed");
    _;
  }

  modifier canBid(
    uint256 _bidValue
  ){
    require(block.timestamp <= endTimestamp
      && _bidValue > currentValue
      && !isFinished, "it's finished or bid vlaue is less than current value");
    _;
  }

  constructor (
    address  _token721,
    address  _token20,
    uint256  _tokenId,
    uint     _lowestValue,
    uint     _closingValue,
    uint     _endTimestamp
  )
    public
  {
    token721 = _token721;
    token20  = _token20;
    tokenId  = _tokenId;
    lowestValue = _lowestValue;
    closingValue = _closingValue;
    endTimestamp  = _endTimestamp;
    currentValue = _lowestValue;
    isFinished    = false;
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
   * get bid infomation
   */
  function getBidInfo()
    external
    view
    returns (uint _bidValue, address _bidAddress, uint _endTime, bool _gameover)
  {
    _bidValue   = currentValue;
    _bidAddress = currentAddress;
    _endTime = endTimestamp;
    _gameover = isFinished;
  }

  /**
   * @dev bid
   * @param   _bidValue   竞拍出价
   */
  function bid(uint _bidValue)
    external
    canBid(_bidValue)
  {
    // 1. 退回前一位出价者的代币
    if(currentAddress != address(0) && currentAddress != msg.sender){
      refund(currentAddress);
    }
    // 2. 更新当前拍卖信息
    updateBidInfo(msg.sender, _bidValue);
    // 3. 触发所有权的转换
    if(closingValue > 0 && _bidValue >= closingValue){
      triggerExchange();
    }
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
   * @dev update bid info
   * @param   _newAddress   新的竞拍者地址
   * @param   _newValue     新的竞拍价
   */
  function updateBidInfo(
    address _newAddress,
    uint    _newValue
  )
    internal
  {
    uint freezeVal = TokenDMA(token20).freezeValue(_newAddress, address(this));
    require(freezeVal >= _newValue, "freeze value of new adderss isn't enough");
    currentAddress = _newAddress;
    currentValue = _newValue;
  }

  /**
   * @dev trigger exchange
   */
  function triggerExchange(
  )
    internal
  {
    address tokenOwner = NFTokenDMA(token721).ownerOf(tokenId);
    address approvedAddr = NFTokenDMA(token721).getApproved(tokenId);
    require(approvedAddr == address(this), "invalid approve address");
    TokenDMA(token20).transferFromFreeze(currentAddress, tokenOwner, currentValue);
    NFTokenDMA(token721).safeTransferFrom(tokenOwner, currentAddress, tokenId);
    refund(msg.sender);
    isFinished = true;
  }

  /**
   * @dev finish exchange
   */
  function exchange()
    external
    timeExceed
    notFinished
  {
    triggerExchange();
  }

  /**
   * @dev revoke token approve
   */
  function revokeToken()
    external
  {
    require(msg.sender != currentAddress, "current address could not call this");
    refund(msg.sender);
  }

}