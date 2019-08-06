const TokenDMA = artifacts.require('TokenDMA');
const NFTokenDMA = artifacts.require('NFTokenDMA');
const Nlucky = artifacts.require('Nlucky');
const assertRevert = require('../helpers/assertRevert');
const addHours = require('date-fns/add_hours');
const subMillisconds = require('date-fns/sub_milliseconds');
const getTime = require('date-fns/get_time');

contract('dma/Nlucky', (accounts) => {
  let nftoken;
  let token;
  let nlucky;
  const id1 = 1;
  const sale = accounts[5];
  const buyer1 = accounts[1];
  const buyer2 = accounts[2];
  const buyer3 = accounts[3];
  const buyer4 = accounts[4];
  const decimalsMul = new web3.BigNumber('1e+18');
  const tonkenAmount = decimalsMul.mul(200);
  const partions = 5;
  const price = decimalsMul.mul(2);

  beforeEach(async () => {
    nftoken = await NFTokenDMA.new('Foo', 'F', 'metadata', true);
    token = await TokenDMA.new();
    await token.transfer(buyer1, tonkenAmount);
    await token.transfer(buyer2, tonkenAmount);
    await token.transfer(buyer3, tonkenAmount);
    await token.transfer(buyer4, tonkenAmount);
    await nftoken.mint(sale, id1, 'url1', true, true);
    nlucky = await Nlucky.new(nftoken.address, token.address, id1, partions, price, getTime(addHours(new Date(), 1)));
    await nftoken.approve(nlucky.address, id1, {from: sale});
  });

  it('bet', async () => {
    await token.approveFreeze(nlucky.address, price, {from: buyer1});
    await token.approveFreeze(nlucky.address, price, {from: buyer2});
    await token.approveFreeze(nlucky.address, price, {from: buyer3});
    await token.approveFreeze(nlucky.address, price, {from: buyer4});

    await nlucky.bet({from: buyer1});
    await nlucky.bet({from: buyer2});
    await nlucky.bet({from: buyer3});
    await nlucky.bet({from: buyer4});
    let [cnt, isFinished, luckAddr] = await nlucky.getBetInfo();
    assert.equal(cnt.toString(), 4);
  });

  it('enough participants and success', async () => {
    await token.approveFreeze(nlucky.address, price, {from: buyer1});
    await token.approveFreeze(nlucky.address, price, {from: buyer2});
    await token.approveFreeze(nlucky.address, price, {from: buyer3});
    await token.approveFreeze(nlucky.address, price, {from: buyer4});
    await token.approveFreeze(nlucky.address, price, {from: buyer4});

    await nlucky.bet({from: buyer1});
    await nlucky.bet({from: buyer2});
    await nlucky.bet({from: buyer3});
    await nlucky.bet({from: buyer4});
    await nlucky.bet({from: buyer4});

    let [cnt, isFinished, luckAddr] = await nlucky.getBetInfo();
    assert.equal(isFinished, true);

    let owner = await nftoken.ownerOf(id1);
    assert.notEqual(owner, sale);
    assert.equal(owner, luckAddr);

    let buyer1Bal = await token.balanceOf(buyer1);
    let buyer2Bal = await token.balanceOf(buyer2);
    let buyer3Bal = await token.balanceOf(buyer3);
    let buyer4Bal = await token.balanceOf(buyer4);
    let saleBal = await token.balanceOf(sale);

    assert.equal(buyer1Bal.toString(), tonkenAmount.minus(price).toString());
    assert.equal(buyer2Bal.toString(), tonkenAmount.minus(price).toString());
    assert.equal(buyer3Bal.toString(), tonkenAmount.minus(price).toString());
    assert.equal(buyer4Bal.toString(), tonkenAmount.minus(price.mul(2)).toString());
    assert.equal(saleBal.toString(), price.mul(partions));
  });

  it('not enough participants and fails', async () => {
    await token.approveFreeze(nlucky.address, price, {from: buyer1});
    await token.approveFreeze(nlucky.address, price, {from: buyer2});
    await token.approveFreeze(nlucky.address, price, {from: buyer3});
    await token.approveFreeze(nlucky.address, price, {from: buyer4});

    await nlucky.bet({from: buyer1});
    await nlucky.bet({from: buyer2});
    await nlucky.bet({from: buyer3});
    await nlucky.bet({from: buyer4});

    let [btime, __endtime] = await nlucky.getEndTimeStamp();
    await nlucky.setEndTimestamp(btime - 1000000);

    let [cnt, isFinished, luckAddr] = await nlucky.getBetInfo();
    assert.equal(cnt.toString(), 4);
    assert.equal(isFinished, false);

    await nlucky.fails(10);

    let owner = await nftoken.ownerOf(id1);
    assert.equal(owner, sale);

    let buyer1Bal = await token.balanceOf(buyer1);
    let buyer2Bal = await token.balanceOf(buyer2);
    let buyer3Bal = await token.balanceOf(buyer3);
    let buyer4Bal = await token.balanceOf(buyer4);
    let saleBal = await token.balanceOf(sale);

    assert.equal(buyer1Bal.toString(), tonkenAmount.toString());
    assert.equal(buyer2Bal.toString(), tonkenAmount.toString());
    assert.equal(buyer3Bal.toString(), tonkenAmount.toString());
    assert.equal(buyer4Bal.toString(), tonkenAmount.toString());
    assert.equal(saleBal.toString(), 0);
  });

});
