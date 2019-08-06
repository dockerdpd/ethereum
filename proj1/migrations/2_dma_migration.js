const AssetMap = artifacts.require('../mocks/AssetMap.sol');
const TokenDMA = artifacts.require('../mocks/TokenDMA.sol');
const NFTokenDMA = artifacts.require('../mocks/NFTokenDMA.sol');
const DMAPlatform = artifacts.require('../mocks/DMAPlatform.sol');

module.exports = function(deployer){
  deployer.deploy(TokenDMA).then(() => {
    return deployer.deploy(NFTokenDMA, 'NFDMAToken', 'NFDMA', 'MetaData', true);
  }).then(() => {
    return deployer.deploy(DMAPlatform, NFTokenDMA.address, TokenDMA.address);
  });
};
