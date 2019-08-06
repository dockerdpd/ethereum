const TokenDMA = artifacts.require('TokenDMA');
const NFTokenDMA = artifacts.require('NFTokenDMA');
const Auction = artifacts.require('Auction');
const assertRevert = require('../helpers/assertRevert');
const addHours = require('date-fns/add_hours');
const subMillisconds = require('date-fns/sub_milliseconds');
const getTime = require('date-fns/get_time');

contract('dma/Auction', (accounts) => {
  let nftoken;
  let token;
  let auction;
  const id1 = 1;
  const sale = accounts[5];
  const buyer1 = accounts[1];
  const buyer2 = accounts[2];
  const buyer3 = accounts[3];
  const decimalsMul = new web3.BigNumber('1e+18');
  const tonkenAmount = decimalsMul.mul(200);

  beforeEach(async () => {
    nftoken = await NFTokenDMA.new('Foo', 'F', 'metadata', true);
    token = await TokenDMA.new();
    await token.transfer(buyer1, tonkenAmount);
    await token.transfer(buyer2, tonkenAmount);
    await token.transfer(buyer3, tonkenAmount);
  });

  it('new auction', async () =>{
    let lowestVal = decimalsMul.mul(5);
    auction = await Auction.new(nftoken.address, token.address, id1, lowestVal, 0, getTime(addHours(new Date(), 1)));
    let [currentVal, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), lowestVal.toString());
  });

  it('bid', async () => {
    let lowestVal = decimalsMul.mul(5);
    let bid1Val = decimalsMul.mul(7);
    let bid1Va2 = decimalsMul.mul(8);
    let bid1Va3 = decimalsMul.mul(9);
    auction = await Auction.new(nftoken.address, token.address, id1, lowestVal, 0, getTime(addHours(new Date(), 1)));
    await token.approveFreeze(auction.address, lowestVal, {from: buyer1});
    await assertRevert(auction.bid(lowestVal, {from: buyer1}));

    await token.approveFreeze(auction.address, bid1Val, {from: buyer2});
    await auction.bid(bid1Val, {from: buyer2});
    let [currentVal, address, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), bid1Val.toString());
    await assertRevert(auction.bid(bid1Val, {from: buyer2}));

    await token.approveFreeze(auction.address, bid1Va2, {from: buyer3});
    await auction.bid(bid1Va2, {from: buyer3});
    [currentVal, address, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), bid1Va2.toString());
    await assertRevert(auction.bid(bid1Va3, {from: buyer3}));
  });

  it('revokd token approve', async () => {
    let lowestVal = decimalsMul.mul(5);
    auction = await Auction.new(nftoken.address, token.address, id1, lowestVal, 0, getTime(addHours(new Date(), 1)));
    await token.approveFreeze(auction.address, lowestVal, {from: buyer1});
    await auction.revokeToken({from: buyer1});
    let val = await token.freezeValue(buyer1, auction.address);
    assert.equal(val.toString(), 0);
  });

  it('bid and exchange', async () => {
    let lowestVal = decimalsMul.mul(5);
    let closingVal = decimalsMul.mul(15);
    let bid1Val = decimalsMul.mul(9);
    let bid1Va2 = decimalsMul.mul(10);
    let bid1Va3 = decimalsMul.mul(20);

    await nftoken.mint(sale, id1, 'url1', true, true);
    auction = await Auction.new(nftoken.address, token.address, id1, lowestVal, closingVal, getTime(addHours(new Date(), 1)));
    await nftoken.approve(auction.address, id1, {from: sale});

    await token.approveFreeze(auction.address, lowestVal, {from: buyer1});

    await token.approveFreeze(auction.address, bid1Val, {from: buyer2});
    await auction.bid(bid1Val, {from: buyer2});
    let [currentVal, address, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), bid1Val.toString());
    await assertRevert(auction.bid(bid1Val, {from: buyer2}));

    await token.approveFreeze(auction.address, bid1Va2, {from: buyer3});
    await auction.bid(bid1Va2, {from: buyer3});
    [currentVal, address, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), bid1Va2.toString());

    await token.approveFreeze(auction.address, bid1Va2, {from: buyer3});
    await auction.bid(bid1Va3, {from: buyer3});
    [currentVal, address, endtime, isFinish] = await auction.getBidInfo();
    assert.equal(isFinish, true);
    let saleBal = await token.balanceOf(sale);
    let buyer1Bal = await token.balanceOf(buyer1);
    let buyer2Bal = await token.balanceOf(buyer2);
    let buyer3Bal = await token.balanceOf(buyer3);
    assert.equal(buyer1Bal.toString(), tonkenAmount.minus(lowestVal).toString());
    assert.equal(buyer2Bal.toString(), tonkenAmount.toString());
    assert.equal(buyer3Bal.toString(), tonkenAmount.minus(bid1Va3).toString());
    assert.equal(saleBal.toString(), bid1Va3.toString());
    let ownerAddr = await nftoken.ownerOf(id1);
    assert.equal(ownerAddr, buyer3);
  });

  it('bid and endtime exceed', async () => {
    let lowestVal = decimalsMul.mul(5);
    let closingVal = decimalsMul.mul(30);
    let bid1Val = decimalsMul.mul(9);
    let bid1Va2 = decimalsMul.mul(10);
    let bid1Va3 = decimalsMul.mul(20);

    await nftoken.mint(sale, id1, 'url1', true, true);
    auction = await Auction.new(nftoken.address, token.address, id1, lowestVal, closingVal, getTime(addHours(new Date(), 1)));
    await nftoken.approve(auction.address, id1, {from: sale});

    await token.approveFreeze(auction.address, lowestVal, {from: buyer1});

    await token.approveFreeze(auction.address, bid1Val, {from: buyer2});
    await auction.bid(bid1Val, {from: buyer2});
    let [currentVal, address, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), bid1Val.toString());
    await assertRevert(auction.bid(bid1Val, {from: buyer2}));

    await token.approveFreeze(auction.address, bid1Va2, {from: buyer3});
    await auction.bid(bid1Va2, {from: buyer3});
    [currentVal, address, ...rest] = await auction.getBidInfo();
    assert.equal(currentVal.toString(), bid1Va2.toString());

    await token.approveFreeze(auction.address, bid1Va2, {from: buyer3});
    await auction.bid(bid1Va3, {from: buyer3});
    [currentVal, address, endtime, isFinish] = await auction.getBidInfo();

    let [btime, __endtime] = await auction.getEndTimeStamp();
    await auction.setEndTimestamp(btime - 1000000);
    await auction.exchange();

    let saleBal = await token.balanceOf(sale);
    let buyer1Bal = await token.balanceOf(buyer1);
    let buyer2Bal = await token.balanceOf(buyer2);
    let buyer3Bal = await token.balanceOf(buyer3);
    assert.equal(buyer1Bal.toString(), tonkenAmount.minus(lowestVal).toString());
    assert.equal(buyer2Bal.toString(), tonkenAmount.toString());
    assert.equal(buyer3Bal.toString(), tonkenAmount.minus(bid1Va3).toString());
    assert.equal(saleBal.toString(), bid1Va3.toString());
    let ownerAddr = await nftoken.ownerOf(id1);
    assert.equal(ownerAddr, buyer3);
  });
});
