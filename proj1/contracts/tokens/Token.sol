pragma solidity ^0.4.24;

import "@0xcert/ethereum-utils/contracts/math/SafeMath.sol";
import "@0xcert/ethereum-utils/contracts/ownership/Ownable.sol";
import "./ERC20.sol";

/**
 * @title ERC20 standard token implementation.
 * @dev Standard ERC20 token. This contract follows the implementation at https://goo.gl/mLbAPJ.
 */
contract Token is
  ERC20,
  Ownable
{
  using SafeMath for uint256;

  /**
   * Token name.
   */
  string internal tokenName;

  /**
   * Token symbol.
   */
  string internal tokenSymbol;

  /**
   * Number of decimals.
   */
  uint8 internal tokenDecimals;

  /**
   * Total supply of tokens.
   */
  uint256 internal tokenTotalSupply;

  /**
   * allow kill the contract itself
   */
  bool internal isBurn;

  /**
   * Balance information map.
   */
  mapping (address => uint256) internal balances;

  /**
   * Token allowance mapping.
   */
  mapping (address => mapping (address => uint256)) internal allowed;

  /**
   * Token Freeze mapping.
   */
  mapping (address => mapping (address => uint256)) internal freeze;
  /**
   * @dev Trigger when tokens are transferred, including zero value transfers.
   */
  event Transfer(
    address indexed _from,
    address indexed _to,
    uint256 _value
  );

  /**
   * @dev Trigger on any successful call to approve(address _spender, uint256 _value).
   */
  event Approval(
    address indexed _owner,
    address indexed _spender,
    uint256 _value
  );

  /**
   * @dev Trigger on any successful call to approveFreeze(address _spender, uint256 _value).
   */
  event ApprovalFreeze(
    address indexed _owner,
    address indexed _spender,
    uint256 _value
  );

  /**
   * @dev Trigger on any successful call to revokeApprove(address _spender, uint256 _value).
   */
  event RevokeApprove(
    address indexed _owner,
    address indexed _spender,
    uint256 indexed _amount
  );

  /**
   * @dev Returns the name of the token.
   */
  function name()
    external
    view
    returns (string _name)
  {
    _name = tokenName;
  }

  /**
   * @dev Returns the symbol of the token.
   */
  function symbol()
    external
    view
    returns (string _symbol)
  {
    _symbol = tokenSymbol;
  }

  /**
   * @dev Returns the number of decimals the token uses.
   */
  function decimals()
    external
    view
    returns (uint8 _decimals)
  {
    _decimals = tokenDecimals;
  }

  /**
   * @dev Returns the total token supply.
   */
  function totalSupply()
    external
    view
    returns (uint256 _totalSupply)
  {
    _totalSupply = tokenTotalSupply;
  }

  /**
   * @dev Returns the account balance of another account with address _owner.
   * @param _owner The address from which the balance will be retrieved.
   */
  function balanceOf(
    address _owner
  )
    external
    view
    returns (uint256 _balance)
  {
    _balance = balances[_owner];
  }

  /**
   * @dev Transfers _value amount of tokens to address _to, and MUST fire the Transfer event. The
   * function SHOULD throw if the _from account balance does not have enough tokens to spend.
   * @param _to The address of the recipient.
   * @param _value The amount of token to be transferred.
   */
  function transfer(
    address _to,
    uint256 _value
  )
    public
    returns (bool _success)
  {
    require(_value <= balances[msg.sender]);

    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);

    emit Transfer(msg.sender, _to, _value);
    _success = true;
  }

  /**
   * @dev Allows _spender to withdraw from your account multiple times, up to the _value amount. If
   * this function is called again it overwrites the current allowance with _value.
   * @param _spender The address of the account able to transfer the tokens.
   * @param _value The amount of tokens to be approved for transfer.
   */
  function approve(
    address _spender,
    uint256 _value
  )
    public
    returns (bool _success)
  {
    require(_value > 0,"value less 0");

    allowed[msg.sender][_spender] = _value;

    emit Approval(msg.sender, _spender, _value);
    _success = true;
  }

  /**
   * approve and freeze token
   */
  function approveFreeze(
    address _spender,
    uint256 _value
  )
    public
    returns (bool _success)
  {
    require(_value >= 0, "value should not less than 0");
    require(_spender != address(0), "spender address invalid");
    require(_value <= balances[msg.sender], "approve value could not more than balance");

    balances[msg.sender] = balances[msg.sender].sub(_value);
    freeze[msg.sender][_spender] = freeze[msg.sender][_spender].add(_value);

    emit ApprovalFreeze(msg.sender, _spender, _value);
    _success = true;
  }

  /**
   * @dev  解除授权，由被授权者调用
   * @param  _owner   授权者
   * @param  _amount  授权额度
   */
  function revokeApprove(
    address _owner,
    uint256 _amount
  )
    external
  {
    require(_owner != address(0), "owner address invalid");
    require(_amount >= 0 && _amount <= freeze[_owner][msg.sender], "invalid amount");

    balances[_owner] = balances[_owner].add(_amount);
    freeze[_owner][msg.sender] = freeze[_owner][msg.sender].sub(_amount);

    emit RevokeApprove(_owner, msg.sender, _amount);
  }

  /**
   * get the freeze value
   */
  function freezeValue(
    address _owner,
    address _spender
  )
    external
    view
    returns (uint256 _remaining)
  {
    _remaining = freeze[_owner][_spender];
  }

  /**
   * transfer from freeze
   */

  function transferFromFreeze(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool _success)
  {
    require(_value <= freeze[_from][msg.sender], "value not enough");

    balances[_to] = balances[_to].add(_value);
    freeze[_from][msg.sender] = freeze[_from][msg.sender].sub(_value);

    emit Transfer(_from, _to, _value);
    _success = true;
  }

  /**
   * @dev Returns the amount which _spender is still allowed to withdraw from _owner.
   * @param _owner The address of the account owning tokens.
   * @param _spender The address of the account able to transfer the tokens.
   */
  function allowance(
    address _owner,
    address _spender
  )
    external
    view
    returns (uint256 _remaining)
  {
    _remaining = allowed[_owner][_spender];
  }

  /**
   * @dev Transfers _value amount of tokens from address _from to address _to, and MUST fire the
   * Transfer event.
   * @param _from The address of the sender.
   * @param _to The address of the recipient.
   * @param _value The amount of token to be transferred.
   */
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool _success)
  {
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);

    emit Transfer(_from, _to, _value);
    _success = true;
  }

  /**
   * @dev kill contract itself
   */
  function kill
  (

  )
    external
    onlyOwner
  {
    require(isBurn == true, "contract can't be kill by ifself");
    selfdestruct(owner);
  }

  /**
   * @dev add issue to someone
   * @param   _target  the target address to issue
   * @param   _amount  the issue amount
   */
  function addIssue(
    address _target,
    uint256 _amount
  )
    external
    onlyOwner
  {
    require(_amount > 0, "issue amount should more than 0");
    tokenTotalSupply = tokenTotalSupply.add(_amount);
    balances[_target] = balances[_target].add(_amount);
  }

}
