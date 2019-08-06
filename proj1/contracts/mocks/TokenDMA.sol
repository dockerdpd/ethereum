pragma solidity ^0.4.24;

import "../tokens/Token.sol";

/**
 * @dev This is an example contract implementation of Token.
 */
contract TokenDMA is Token {

  constructor()
    public
  {
    tokenName = "Mock Token";
    tokenSymbol = "MCK";
    tokenDecimals = 18;
    tokenTotalSupply = 300000000000000000000000000;
    balances[msg.sender] = tokenTotalSupply;
    isBurn = true;
  }
}
