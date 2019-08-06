const NFTokenDMA = artifacts.require('NFTokenDMA');
const AssetMap = artifacts.require('AssetMap');
const util = require('ethjs-util');
const assertRevert = require('../helpers/assertRevert');

contract('dma/NFToken', (accounts) => {
  let nftoken;
  let asMap;
  const id1 = 1;
  const id2 = 20;
  const id3 = 30;
  const id4 = 40;

  beforeEach(async () => {
    nftoken = await NFTokenDMA.new('Foo', 'F', 'metadata', true);
  });
/*
  it('mint single', async () => {

 
  await nftoken.mint(accounts[1], id2, 'url2', true, true);
  
 });
   */
  });

  it('correctly checks all the supported interfaces', async () => {
    const nftokenInterface = await nftoken.supportsInterface('0x80ac58cd');
    const nftokenMetadataInterface = await nftoken.supportsInterface('0x5b5e139f');
    const nftokenEnumerableInterface = await nftoken.supportsInterface('0x780e9d63');
    assert.equal(nftokenInterface, true);
    assert.equal(nftokenMetadataInterface, true);
    assert.equal(nftokenEnumerableInterface, true);
 

  it('returns the correct issuer name', async () => {
    const name = await nftoken.name();
    assert.equal(name, 'Foo');
  });

  it('returns the correct issuer symbol', async () => {
    const symbol = await nftoken.symbol();
    assert.equal(symbol, 'F');
  });

  it('throws when trying to get uri of not existant NFT id', async () => {
    await assertRevert(nftoken.tokenURI(id4));
  });

  it('returns the correct NFT id 2 url', async () => {
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    const tokenURI = await nftoken.tokenURI(id2);
    assert.equal(tokenURI, 'url2');
  });

  it('returns the correct total supply', async () => {
    const totalSupply0 = await nftoken.totalSupply();
    assert.equal(totalSupply0, 0);

    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await nftoken.mint(accounts[1], id2, 'url2', true, true);

    const totalSupply1 = await nftoken.totalSupply();
    assert.equal(totalSupply1, 2);
  });

  it('returns the correct total supply', async () => {
    const totalSupply0 = await nftoken.totalSupply();
    assert.equal(totalSupply0, 0);

    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await nftoken.mint(accounts[1], id2, 'url2', true, true);

    const totalSupply1 = await nftoken.totalSupply();
    assert.equal(totalSupply1, 2);
  });

  it('returns the correct token by index', async () => {
    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    await nftoken.mint(accounts[2], id3, 'url3', true, true);

    const tokenId = await nftoken.tokenByIndex(1);
    assert.equal(tokenId, id2);
  });

  it('throws when trying to get token by unexistant index', async () => {
    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await assertRevert(nftoken.tokenByIndex(1));
  });

  it('returns the correct token of owner by index', async () => {
    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    await nftoken.mint(accounts[2], id3, 'url3', true, true);

    const tokenId = await nftoken.tokenOfOwnerByIndex(accounts[1], 1);
    assert.equal(tokenId, id2);
  });

  it('returns the correct number after combine assets', async () => {
    await nftoken.mintMulti(accounts[1], id1, 2, 'url1', true, true);
    await nftoken.mintMulti(accounts[1], id1, 3, 'url1', true, true);
    await nftoken.mintMulti(accounts[2], id3, 4, 'url3', true, true);

    const tokenId = await nftoken.getLatestTokenId(id1);
    assert.equal(tokenId, id1 + 5);
    const tokenId3 = await nftoken.getLatestTokenId(id3);
    assert.equal(tokenId3, id3 + 4);
  });

  it('throws when trying to get token of owner by unexistant index', async () => {
    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await nftoken.mint(accounts[2], id3, 'url3', true, true);

    await assertRevert(nftoken.tokenOfOwnerByIndex(accounts[1], 1));
  });

  it('tranfer permission', async () => {
    await nftoken.mint(accounts[1], id1, 'url1', true, true);
    await nftoken.safeTransferFrom(accounts[1], accounts[3], id1, {from: accounts[1]});
    const owner =await nftoken.ownerOf(id1);
    assert.equal(owner, accounts[3]);

    await nftoken.mint(accounts[2], id2, 'url2', true, true);
    await nftoken.approve(accounts[3], id2, {from:accounts[2]});
    await assertRevert(nftoken.safeTransferFrom(accounts[2], accounts[1], id2, {from:accounts[2]}));
    await nftoken.safeTransferFrom(accounts[2], accounts[1], id2, {from:accounts[3]});
    const owner1= await nftoken.ownerOf(id2);
    assert.equal(owner1, accounts[1]);
  });

  it('approve with array', async () => {
    await nftoken.mintMulti(accounts[1], id1, 4,'url1', true, true);
    await nftoken.approveWithAarry(accounts[2], [id1, id1 + 2], {from:accounts[1]});

    const acct = await nftoken.getApproved(id1);
    const acct2 = await nftoken.getApproved(id1 + 2);
    assert.equal(acct2, acct);
    assert.equal(acct, accounts[2]);
  });

  it('corectly burns a NFT', async () => {
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    const { logs } = await nftoken.burn(accounts[1], id2);
    const transferEvent = logs.find(e => e.event === 'Transfer');
    assert.notEqual(transferEvent, undefined);
    const clearApprovalEvent = logs.find(e => e.event === 'Approval');
    assert.equal(clearApprovalEvent, undefined);

    const balance = await nftoken.balanceOf(accounts[1]);
    assert.equal(balance, 0);

    const totalSupply = await nftoken.totalSupply();
    assert.equal(totalSupply, 0);

    await assertRevert(nftoken.ownerOf(id2));
    await assertRevert(nftoken.tokenByIndex(0));
    await assertRevert(nftoken.tokenOfOwnerByIndex(accounts[1], 0));

    const uri = await nftoken.checkUri(id2);
    assert.equal(uri, '');
  });

  it('get correct contract infomation', async() => {
    const [name, symbol, metadata, owner, isBurn] = await nftoken.getInfo();
    assert.equal(name, 'Foo');
    assert.equal(symbol, 'F');
    assert.equal(metadata, 'metadata');
    assert.equal(isBurn, true);
    assert.equal(owner, accounts[0]);
  });

  it('get and set metedata', async () => {
    await nftoken.setMetadata('new metadata');
    const ma = await nftoken.getMetadata();
    assert.equal(ma, 'new metadata');
  });

  it('get and set token status', async () => {
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    await nftoken.setStatus(id2, 1, {from: accounts[1]});
    const st = await nftoken.getStatus(id2);
    assert.equal(st, 1);
  });

  it('get and set token user', async () => {
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    await nftoken.setUser(id2, 'user', {from: accounts[1]});
    const st = await nftoken.getUser(id2);
    assert.equal(st, 'user');
  });

  it('get correct info with getTokenInfo', async() => {
    await nftoken.mint(accounts[1], id2, 'url2', true, true);
    const [owner, isTransfer, isBure, uri, status, user] = await nftoken.getTokenInfo(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(isTransfer, true);
    assert.equal(isBure, true);
    assert.equal(uri, 'url2');
    assert.equal(status, 0);
    assert.equal(user, '');
    await nftoken.setStatus(id2, 2, {from: accounts[1]});
    await nftoken.setUser(id2, 'user', {from: accounts[1]});
    const [owner1, isTransfer1, isBure1, uri1, status1, user1] = await nftoken.getTokenInfo(id2);
    assert.equal(user1, 'user');
    assert.equal(status1, 2);
  });
  
}); 
