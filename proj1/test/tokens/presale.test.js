const TokenDMA = artifacts.require('TokenDMA');
const NFTokenDMA = artifacts.require('NFTokenDMA');
const PreSale = artifacts.require('PreSale');
const assertRevert = require('../helpers/assertRevert');
const addHours = require('date-fns/add_hours');
const subMillisconds = require('date-fns/sub_milliseconds');
const getTime = require('date-fns/get_time');

contract('dma/preSale', (accounts) => {
  let nftoken;
  let token;
  let presale;
  const id1 = 1;
  const sale = accounts[3];
  const buyer1 = accounts[1];
  const buyer2 = accounts[2];
  const receiver1 = accounts[4];
  const receiver2 = accounts[5];
  const decimalsMul = new web3.BigNumber('1e+18');

  beforeEach(async () => {
    const tonkenAmount = decimalsMul.mul(200);
    nftoken = await NFTokenDMA.new('Foo', 'F', 'metadata', true);
    token = await TokenDMA.new();
    await token.transfer(buyer1, tonkenAmount);
    await token.transfer(buyer2, tonkenAmount);
    presale = await PreSale.new(nftoken.address, token.address, getTime(addHours(new Date(), 1)));
    await nftoken.setApprovalForAll(presale.address, true, {from: sale});
  });

  it('register an asset', async () => {
    let price = decimalsMul.mul(1);
    await presale.registAsset(sale, id1, 100, price, 'url1');
    const [owner, tid, amount, val, ...rest] = await presale.getRegisterInfo(id1);
    assert.equal(owner, sale);
    assert.equal(tid, id1);
    assert.equal(amount, 100);
    assert.equal(val.toString(), price.toString());
  });

  it('made an order', async () => {
    let orderAmn = 2;
    let freezeAmount = decimalsMul.mul(5);
    await presale.registAsset(sale, id1, 100, 1, 'url1');
    await token.approveFreeze(presale.address, freezeAmount, {from: buyer1});
    await presale.order(id1, orderAmn, receiver1, {from: buyer1});
    const [addr, tid, amount, recAddr] = await presale.getOrderInfo(buyer1, id1);
    assert.equal(addr, buyer1);
    assert.equal(tid, id1);
    assert.equal(amount, orderAmn);
    assert.equal(recAddr, receiver1);
  });

  it('refund an order', async () => {
    let orderAmn = 5;
    let refundAmn = 3;
    let freezeAmount = decimalsMul.mul(10);
    await presale.registAsset(sale, id1, 100, decimalsMul.mul(1), 'url1');
    await token.approveFreeze(presale.address, freezeAmount, {from: buyer1});
    await presale.order(id1, orderAmn, receiver1, {from: buyer1});
    await presale.refund(id1, refundAmn, {from: buyer1});

    const [addr, tid, amount, recAddr] = await presale.getOrderInfo(buyer1, id1);
    assert.equal(addr, buyer1);
    assert.equal(tid, id1);
    assert.equal(amount, orderAmn - refundAmn);
    assert.equal(recAddr, receiver1);

    let fzval = await token.freezeValue(buyer1, presale.address);
    assert.equal(fzval.toString(), freezeAmount.minus(decimalsMul.mul(refundAmn)).toString());
  });

  it('mint an order', async () => {
    let orderAmn = 5;
    let freezeAmount = decimalsMul.mul(10);
    await presale.registAsset(sale, id1, 100, decimalsMul.mul(1), 'url1');
    await token.approveFreeze(presale.address, freezeAmount, {from: buyer1});
    await presale.order(id1, orderAmn, receiver1, {from: buyer1});
    let orderCnt = await presale.getOrderCount(id1);
    assert.equal(orderCnt, 5);

    const [btime, endtime] = await presale.getEndTimeStamp();
    await presale.setEndTimestamp(btime - 1000000);
    await presale.mintByCustomer(id1, {from: buyer1});

    let saleBal = await token.balanceOf(sale);
    assert.equal(saleBal.toString(), decimalsMul.mul(orderAmn).toString());

    let buyer1Bal = await token.balanceOf(buyer1);
    assert.equal(buyer1Bal.toString(), decimalsMul.mul(200).minus(freezeAmount).toString());

    let buyer1Freeze =await token.freezeValue(buyer1, presale.address);
    assert.equal(buyer1Freeze.toString(), freezeAmount.minus(decimalsMul.mul(orderAmn)).toString());

    let address = await nftoken.ownerOf(id1);
    let address2 = await nftoken.ownerOf(id1+1);
    assert.equal(address, address2);
    assert.equal(address, receiver1);

  });

  it('mint by the platform', async () => {
    let orderAmn = 5;
    let freezeAmount = decimalsMul.mul(10);
    await presale.registAsset(sale, id1, 100, decimalsMul.mul(1), 'url1');
    await token.approveFreeze(presale.address, freezeAmount, {from: buyer1});
    await presale.order(id1, orderAmn, receiver1, {from: buyer1});
    let orderCnt = await presale.getOrderCount(id1);
    assert.equal(orderCnt, 5);

    await token.approveFreeze(presale.address, freezeAmount, {from: buyer2});
    await presale.order(id1, orderAmn, receiver2, {from: buyer2});
    orderCnt = await presale.getOrderCount(id1);
    assert.equal(orderCnt, 10);

    const [btime, endtime] = await presale.getEndTimeStamp();
    await presale.setEndTimestamp(btime - 1000000);
    await presale.mintByPlatform(id1, 10);

    let saleBal = await token.balanceOf(sale);
    assert.equal(saleBal.toString(), decimalsMul.mul(orderAmn*2).toString());

    let buyer1Bal = await token.balanceOf(buyer1);
    assert.equal(buyer1Bal.toString(), decimalsMul.mul(200).minus(freezeAmount).toString());

    let buyer1Freeze =await token.freezeValue(buyer1, presale.address);
    assert.equal(buyer1Freeze.toString(), freezeAmount.minus(decimalsMul.mul(orderAmn)).toString());

    buyer1Freeze =await token.freezeValue(buyer2, presale.address);
    assert.equal(buyer1Freeze.toString(), freezeAmount.minus(decimalsMul.mul(orderAmn)).toString());

    let address = await nftoken.ownerOf(id1);
    let address2 = await nftoken.ownerOf(id1+1);
    assert.equal(address, address2);
    assert.equal(address, receiver1);

    address = await nftoken.ownerOf(id1+5);
    address2 = await nftoken.ownerOf(id1+6);
    assert.equal(address, address2);
    assert.equal(address, receiver2);
  });
});
