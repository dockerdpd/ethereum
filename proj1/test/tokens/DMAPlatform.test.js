const AssetMap = artifacts.require('AssetMap');
const DMAPlatform = artifacts.require('DMAPlatform');
const NFTokenDMA = artifacts.require('NFTokenDMA');
const TokenDMA = artifacts.require('TokenDMA');
const util = require('ethjs-util');
const assertRevert = require('../helpers/assertRevert');

contract('dma/Platform', (accounts) => {
  let nftoken;
  let token;
  let platform;
  let asMap;
  let allowedAccount;
  const id1 = 1;
  const id2 = 20;
  const id3 = 30;
  const id4 = 40;
  const seller = accounts[0];
  const buyer = accounts[1];
  const tokenTotalSupply = new web3.BigNumber('3e+26');
  const ownerSupply = new web3.BigNumber('3e+26');

  // To send the right amount of tokens, taking in account number of decimals.
  const decimalsMul = new web3.BigNumber('1e+18');

  beforeEach(async () => {
    const tonkenAmount = decimalsMul.mul(200);
    nftoken = await NFTokenDMA.new('Foo', 'F', 'metadata', true);
    token = await TokenDMA.new();
    await token.transfer(buyer, tonkenAmount);
    platform = await DMAPlatform.new(nftoken.address, token.address);
  });


  
  it('test for onERC721Receiyed',async() =>{

  await nftoken.mint(accounts[1],id1,'url1',true,true);
  //platform.address 平台合约地址
  await nftoken.safeTransferFrom(accounts[1],accounts[3],id1,{from:accounts[1]});
  var owner =await nftoken.ownerof(id1);
  //验证资产的所有者时账号3
  assert.equal(owner,accounts[3]);
  });
  



/*

  it('test initial transfer token to buyer', async () => {
    const tonkenAmount = decimalsMul.mul(200);
    const sellerBalance = await token.balanceOf(seller);
    const buyerBalance = await token.balanceOf(buyer);
    assert.equal(buyerBalance.toString(), tonkenAmount.toString());
    assert.equal(sellerBalance.toString(), ownerSupply.minus(tonkenAmount).toString());
  });

  it('returns the correct issuer name', async () => {
    const name = await nftoken.name();
    assert.equal(name, 'Foo');
  });

  it('register a aaset', async () => {
    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    const totalSupply0 = await nftoken.totalSupply();
    assert.equal(totalSupply0, 1);
    assert.equal(sellerCnt.toString(), 1);
    const result = await platform.getApproveinfo(id2);
    const [owner, tid, value] = result;
    assert.equal(tid, id2);
    assert.equal(value, amount.toString());
    assert.equal(owner, seller);
  });

  it('register assets with array', async () => {
    const amount = decimalsMul.mul(5);
    const arr = [id2, id2+2, id2+4];
    await nftoken.mintMulti(seller, id2, 5, 'url2', true, true);
    await nftoken.approveWithAarry(platform.address, arr, {from: seller});
    await platform.saveApproveWithArray(seller, arr, amount, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    const totalSupply0 = await nftoken.totalSupply();
    assert.equal(totalSupply0.toString(), 5);
    assert.equal(sellerCnt.toString(), 3);
    const result = await platform.getApproveinfo(id2);
    const [owner, tid, value] = result;
    assert.equal(tid, id2);
    assert.equal(value, amount.toString());
    assert.equal(owner, seller);
  });

  it('combine multi approve', async () => {
    const amount = decimalsMul.mul(5);
    await nftoken.mintMulti(seller, id2, 3, 'url2', true, true);
    await nftoken.approveMulti(platform.address, id2, 3, {from: seller});
    await platform.saveMultiApprove(seller, id2, 3, amount, {from: seller});

    const tokenId = await platform.getLatestTokenId(id2);
    assert.equal(tokenId, id2 + 3);
  });

  it('revoke a aaset', async () => {
    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    await platform.revokeApprove(id2, 1, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);
  });

  it('revoke multi aaset', async () => {
    const amount = decimalsMul.mul(5);
    const cnt = 3;
    for (let idx = 0; idx < cnt; idx++) {
      await nftoken.mint(seller, id2+idx, 'url2', true, true);
      await nftoken.approve(platform.address, id2+idx, {from: seller});
      await platform.saveApprove(seller, id2, amount, {from: seller});
      let lid = await platform.getLatestTokenId(id2);
      assert.equal(lid.toString(), id2 + idx + 1);
    }
    const lastId = await platform.getLatestTokenId(id2);
    assert.equal(lastId.toString(), id2 + cnt);
    await platform.revokeApprove(id2, cnt, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);
  });

  it('make transfer', async () => {
    const approveAmount = decimalsMul.mul(10);
    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    await token.approveFreeze(platform.address, approveAmount, {from: buyer});
    await platform.transfer(seller, id2, 1, amount, {from:buyer});
    const buyerBal = await token.balanceOf(buyer);
    const sellerBal = await token.balanceOf(seller);
    const approveAmt = await token.freezeValue(buyer, platform.address);
    assert.equal(buyerBal.toString(), decimalsMul.mul(190).toString());
    assert.equal(sellerBal.toString(), ownerSupply.minus(decimalsMul.mul(195)).toString());
    assert.equal(approveAmt.toString(), amount.toString());
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);
  });

  it('make transfer and delete approve', async () => {
    const approveAmount = decimalsMul.mul(10);
    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    const [addr, tid, value] = await platform.getApproveinfo(id2);
    assert.equal(addr, seller);
    assert.equal(tid, id2);
    assert.equal(value, amount.toString());
    await token.approveFreeze(platform.address, approveAmount, {from: buyer});
    await platform.transfer(seller, id2, 1, amount, {from:buyer});
    const buyerBal = await token.balanceOf(buyer);
    const sellerBal = await token.balanceOf(seller);
    const approveAmt = await token.freezeValue(buyer, platform.address);
    assert.equal(buyerBal.toString(), decimalsMul.mul(190).toString());
    assert.equal(sellerBal.toString(), ownerSupply.minus(decimalsMul.mul(195)).toString());
    assert.equal(approveAmt.toString(), amount.toString());
    const sellerCnt = await platform.getAssetCnt(seller);
    const [addr1, tid1, value1] = await platform.getApproveinfo(id2);
    assert.equal(addr1, buyer);
    assert.equal(tid1, id2);
    assert.equal(value1, 0 );
    assert.equal(sellerCnt.toString(), 0);
  });

  it('make multi transfer', async () => {
    const approveAmount = decimalsMul.mul(20);
    const amount = decimalsMul.mul(5);
    for (let idx = 0; idx < 3; idx++) {
      await nftoken.mint(seller, id2+idx, 'url2', true, true);
      await nftoken.approve(platform.address, id2+idx, {from: seller});
      await platform.saveApprove(seller, id2+idx, amount, {from: seller});
    }
    await token.approveFreeze(platform.address, approveAmount, {from: buyer});
    await platform.transfer(seller, id2, 3, decimalsMul.mul(15), {from:buyer});
    const buyerBal = await token.balanceOf(buyer);
    const sellerBal = await token.balanceOf(seller);
    const approveAmt = await token.freezeValue(buyer, platform.address);
    assert.equal(buyerBal.toString(), decimalsMul.mul(180).toString());
    assert.equal(sellerBal.toString(), ownerSupply.minus(decimalsMul.mul(185)).toString());
    assert.equal(approveAmt.toString(), amount.toString());
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);
  });

  it('make serial multi transfer', async () => {
    const approveAmount = decimalsMul.mul(40);
    const amount = decimalsMul.mul(2);
    const totale = 9;
    const sales1 = 3;
    const sales2 = 2;
    for (let idx = 0; idx < totale; idx++) {
      await nftoken.mint(seller, id2+idx, 'url2', true, true);
      await nftoken.approve(platform.address, id2+idx, {from: seller});
      await platform.saveApprove(seller, id2+idx, amount, {from: seller});
    }
    await token.approveFreeze(platform.address, approveAmount, {from: buyer});
    await platform.transfer(seller, id2, sales1, amount.mul(sales1), {from:buyer});
    const buyerBal = await token.balanceOf(buyer);
    const sellerBal = await token.balanceOf(seller);
    const approveAmt = await token.freezeValue(buyer, platform.address);
    assert.equal(buyerBal.toString(), decimalsMul.mul(200).minus(approveAmount).toString());
    assert.equal(sellerBal.toString(), ownerSupply.minus(decimalsMul.mul(200)).plus(amount.mul(sales1)).toString());
    assert.equal(approveAmt.toString(), approveAmount.minus(amount.mul(sales1)).toString());
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), totale - sales1);

    const nId = await platform.getLatestSalesTokenId(id2);
    assert.equal(nId, id2+sales1);

    await platform.transfer(seller, id2, sales2, amount.mul(sales2), {from:buyer});
    const nId1 = await platform.getLatestSalesTokenId(id2);
    assert.equal(nId1, id2+sales1+sales2);
  });

  it('make multi transfer with array', async () => {
    const approveAmount = decimalsMul.mul(20);
    const amount = decimalsMul.mul(5);
    const arr = [id2, id2 + 2, id2 + 4];
    for (let idx = 0; idx < arr.length; idx++) {
      const element = arr[idx];
      await nftoken.mint(seller, element, 'url2', true, true);
      await nftoken.approve(platform.address, element, {from: seller});
      await platform.saveApprove(seller, element, amount, {from: seller});
    }
    await token.approveFreeze(platform.address, approveAmount, {from: buyer});
    await platform.transferWithArray(seller, arr, decimalsMul.mul(15), {from:buyer});
    const buyerBal = await token.balanceOf(buyer);
    const sellerBal = await token.balanceOf(seller);
    const approveAmt = await token.freezeValue(buyer, platform.address);
    assert.equal(buyerBal.toString(), decimalsMul.mul(180).toString());
    assert.equal(sellerBal.toString(), ownerSupply.minus(decimalsMul.mul(185)).toString());
    assert.equal(approveAmt.toString(), amount.toString());
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);
  });


  it('For 0102 No.1 ', async () => {

    const amount = decimalsMul.mul(5);

    await nftoken.mintMulti(seller, id1, 10, 'url2', true, true);
    await nftoken.approveMulti(platform.address, id1, 10, {from: seller});


    await platform.saveMultiApprove(seller, id1, 3, amount, {from: seller});
    await platform.saveMultiApprove(seller, id1, 3, amount, {from: seller});


    const result = await platform.getApproveinfo(1);
    const [owner, tid, value] = result;
    assert.equal(tid, 1);
    assert.equal(value, amount.toString());
    assert.equal(owner, seller);


    const result4 = await platform.getApproveinfo(4);
    const [owner4, tid4, value4] = result4;
    assert.equal(tid4, 4);
    assert.equal(value4, amount.toString());
    assert.equal(owner4, seller);

    const result5 = await platform.getApproveinfo(5);
    const [owner5, tid5, value5] = result5;
    assert.equal(tid5, 5);
    assert.equal(value5, amount.toString());
    assert.equal(owner5, seller);

    const result6 = await platform.getApproveinfo(6);
    const [owner6, tid6, value6] = result6;
    assert.equal(tid6, 6);
    assert.equal(value6, amount.toString());
    assert.equal(owner6, seller);

  });

  it('For 0102 No.2 ', async () => {

    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    await platform.revokeApprove(id2, 1, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);

    // await nftoken.mint(seller, id2, 'url2');
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    await platform.revokeApprove(id2, 1, {from: seller});
    const sellerCnt2 = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt2.toString(), 0);

  });


  it('For 0102 No.3', async () => {

    const amount = decimalsMul.mul(5);

    await nftoken.mintMulti(seller, id1, 10, 'url2', true, true);
    await nftoken.approveMulti(platform.address, id1, 3, {from: seller});
    await nftoken.approveMulti(platform.address, id1, 3, {from: seller});

    await platform.saveMultiApprove(seller, id1, 3, amount, {from: seller});
    await platform.saveMultiApprove(seller, id1, 3, amount, {from: seller});


    const result = await platform.getApproveinfo(1);
    const [owner, tid, value] = result;
    assert.equal(tid, 1);
    assert.equal(value, amount.toString());
    assert.equal(owner, seller);

    const result4 = await platform.getApproveinfo(4);
    const [owner4, tid4, value4] = result4;
    assert.equal(tid4, 4);
    assert.equal(value4, amount.toString());
    assert.equal(owner4, seller);

    const result5 = await platform.getApproveinfo(5);
    const [owner5, tid5, value5] = result5;
    assert.equal(tid5, 5);
    assert.equal(value5, amount.toString());
    assert.equal(owner5, seller);

    const result6 = await platform.getApproveinfo(6);
    const [owner6, tid6, value6] = result6;
    assert.equal(tid6, 6);
    assert.equal(value6, amount.toString());
    assert.equal(owner6, seller);

  });


  it('For 0102 No.4', async () => {

    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);

    await nftoken.approve(platform.address, id2, {from: seller});
    await assertRevert(nftoken.approve(platform.address, id2, {from: seller}));

    await platform.saveApprove(seller, id2, amount, {from: seller});
    await platform.revokeApprove(id2, 1, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);

  });

  it('change transfer property with an assert', async () => {

    const amount = decimalsMul.mul(5);
    await nftoken.mint(seller, id2, 'url2', true, true);
    await nftoken.approve(platform.address, id2, {from: seller});
    await platform.saveApprove(seller, id2, amount, {from: seller});
    await platform.revokeApprove(id2, 1, {from: seller});
    const sellerCnt = await platform.getAssetCnt(seller);
    assert.equal(sellerCnt.toString(), 0);

    await nftoken.setIsTransfer(id2, false);
    await assertRevert(platform.saveApprove(seller, id2, amount, {from: seller}));
  });
*/

});
