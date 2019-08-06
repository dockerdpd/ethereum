pragma solidity ^0.4.24;

import "@0xcert/ethereum-utils/contracts/math/SafeMath.sol";

library TokenUtil {
  using SafeMath for uint256;

  /**
   * @dev convert to array
   * @param   _start     开始编号
   * @param   _cnt       数量
   */
  function convert(
    uint256 _start,
    uint256 _cnt
  )
    internal
    pure
    returns (uint256[] memory r)
  {
    r = new uint256[](_cnt);
    for (uint256 i = 0; i < _cnt; i++) {
      r[i] = _start.add(i);
    }
  }
}