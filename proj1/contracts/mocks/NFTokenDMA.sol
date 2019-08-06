pragma solidity ^0.4.24;

import "../tokens/NFTokenMetadata.sol";
import "../tokens/NFTokenEnumerable.sol";
import "@0xcert/ethereum-utils/contracts/ownership/Ownable.sol";
import "./AssetMap.sol";

/**
 * @dev This is an example contract implementation of NFToken with enumerable and metadata
 * extensions.
 */
contract NFTokenDMA is
  NFTokenEnumerable,
  NFTokenMetadata,
  Ownable
{
  using AssetMap for AssetMap.Data;
  // 资产表
  AssetMap.Data assetMap;

  /**
   * @dev a metadata  url for NFTokens.
   */
  string internal metadata;

  /**
   * @dev isBurn allow kill contract self
   */
  bool internal isBurn;

  /**
   * @dev token information
   */
  struct tokenInfo {
    bool isBurn;
    bool isTransfer;
    uint256 status;
    string  user;
  }

  /**
   * @dev token information map
   */
  mapping (uint256 => tokenInfo) internal tokensInfo;

  /**
   * @dev Contract constructor.
   * @param _name A descriptive name for a collection of NFTs.
   * @param _symbol An abbreviated name for NFTokens.
   * @param _metadata A metadata url for NFTokens.
   */
  constructor(
    string _name,
    string _symbol,
    string _metadata,
    bool   _isBurn
  )
    public
  {
    nftName = _name;
    nftSymbol = _symbol;
    metadata = _metadata;
    isBurn = _isBurn;
  }

  /**
   * @dev Mints a new NFT.
   * @param _to The address that will own the minted NFT.
   * @param _tokenId of the NFT to be minted by the msg.sender.
   * @param _uri String representing RFC 3986 URI.
   */

  function _mint(
    address _to,
    uint256 _tokenId,
    string _uri,
    bool   _isTransfer,
    bool   _isBurn
  )
    internal
  {
    super._mint(_to, _tokenId);
    super._setTokenUri(_tokenId, _uri);
    tokensInfo[_tokenId] = tokenInfo({isBurn:_isBurn, isTransfer: _isTransfer, status:0, user:""});
  }

  /**
   * @dev 生成一份资产，内部调用生成多份同类资产方法
   * @param    _tokenId   首个资产编号(作为资产标识)
   * @param    _uri       资产数据网址
   */
  function mint(
    address _to,
    uint256 _tokenId,
    string _uri,
    bool   _isTransfer,
    bool   _isBurn
  )
    external
  {
    mintMulti(_to, _tokenId, 1, _uri, _isTransfer, _isBurn);
  }

  /**
   * @dev 生成多份同类资产
   * @param    _to        资产所有者
   * @param    _tokenId   首个资产编号(作为资产标识)
   * @param    _count     资产数量
   * @param    _uri       资产数据网址
   */
  function mintMulti(
    address _to,
    uint256 _tokenId,
    uint256 _count,
    string _uri,
    bool   _isTransfer,
    bool   _isBurn
  )
    public
  {
    require(_tokenId > 0, "tokenId should over 0");
    require(_count > 0, "Count number should over 0");
    uint256 startId = assetMap.nextTokenId(_tokenId);
    for (uint256 idx = 0; idx < _count; idx++) {
      _mint(_to, startId.add(idx), _uri, _isTransfer, _isBurn);
    }
    assetMap.update(_tokenId, startId.add(_count));
  }

  /**
   * @dev 获取资产的最后一个编号
   * @param    _tokenId   首个资产编号(作为资产标识)
   */
  function getLatestTokenId(
    uint256 _tokenId
  )
    external
    view
    returns (uint256 _tid)
  {
    _tid = assetMap.getLatestTokenId(_tokenId);
  }

  /**
   * @dev Removes a NFT from owner.
   * @param _owner Address from wich we want to remove the NFT.
   * @param _tokenId Which NFT we want to remove.
   */
  function burn(
    address _owner,
    uint256 _tokenId
  )
    external
    onlyOwner
  {
    require(tokensInfo[_tokenId].isBurn == true, "The asset could not be burned");
    super._burn(_owner, _tokenId);
    delete tokensInfo[_tokenId];
  }

  function checkUri(
     uint256 _tokenId
  )
     external
     view
     returns (string)
  {
     return idToUri[_tokenId];
  }

  /**
   * @dev set token staus
   */
  function setStatus(
    uint256 _tokenId,
    uint256 _status
  )
    external
    canTransfer(_tokenId)
  {
    require(_tokenId != 0, "tokenId should not be 0");
    tokensInfo[_tokenId].status = _status;
  }

  /**
   * @dev set token user
   */
  function setUser(
    uint256 _tokenId,
    string  _user
  )
    external
    canTransfer(_tokenId)
  {
    require(_tokenId != 0, "tokenId should not be 0");
    tokensInfo[_tokenId].user = _user;
  }


  /**
   * @dev get token staus
   */
  function getStatus(
    uint256 _tokenId
  )
    external
    view
    validNFToken(_tokenId)
    returns (uint256 _status)
  {
    _status = tokensInfo[_tokenId].status;
  }

  /**
   * @dev get token user
   */
  function getUser(
    uint256 _tokenId
  )
    external
    view
    validNFToken(_tokenId)
    returns (string _user)
  {
    _user = tokensInfo[_tokenId].user;
  }

  /**
   * @dev kill contract self
   */
  function kill
  (

  )
    external
    onlyOwner
  {
    require(isBurn == true, "Contract can't be kill, it's no killable");
    selfdestruct(owner);
  }

  /**
   * @dev Returns metadata for NFToken contract.
   */
  function getMetadata()
    external
    view
    returns (string _metadata)
  {
    _metadata = metadata;
  }

  /**
   * @dev set metadata for NFToken Contract
   */
  function setMetadata(
    string _metadata
  )
    external
    onlyOwner
  {
    metadata = _metadata;
  }

  /**
   * @dev return all information for contract
   */
  function getInfo
  (

  )
    external
    view
    returns (string _name, string _symbol, string _metadata, address _owner, bool _isBurn)
  {
    _name = nftName;
    _symbol = nftSymbol;
    _metadata = metadata;
    _owner = owner;
    _isBurn = isBurn;
  }

  /**
   * @dev get info of token
   */
  function getTokenInfo(
    uint256 _tokenId
  )
    external
    view
    validNFToken(_tokenId)
    returns (address _owner, bool _isTransfer, bool _isBurn, string _uri, uint256 _status, string _user)
  {
    _owner = idToOwner[_tokenId];
    _isTransfer = tokensInfo[_tokenId].isTransfer;
    _isBurn = tokensInfo[_tokenId].isBurn;
    _uri =idToUri[_tokenId];
    _status = tokensInfo[_tokenId].status;
    _user = tokensInfo[_tokenId].user;
  }

  /**
   * @dev get asset is transfer
   */
  function getIsTransfer(
    uint256 _tokenId
  )
    external
    view
    validNFToken(_tokenId)
    returns (bool _isTransfer)
  {
    _isTransfer = tokensInfo[_tokenId].isTransfer;
  }

  /**
   * @dev set asset is transfer
   */
  function setIsTransfer(
    uint256 _tokenId,
    bool    _istransfer
  )
    external
    validNFToken(_tokenId)
    canTransfer(_tokenId)
  {
    tokensInfo[_tokenId].isTransfer = _istransfer;
  }
}
