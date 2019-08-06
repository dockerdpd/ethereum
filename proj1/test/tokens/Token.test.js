const Token = artifacts.require('TokenDMA');
const assertRevert = require('../../node_modules/@0xcert/ethereum-utils/test/helpers/assertRevert');

contract('dma/Token', (accounts) => {
  let token;
  const owner = accounts[0];
  const recipient = accounts[1];
  const allowedAccount = accounts[2];
  const tokenTotalSupply = new web3.BigNumber('3e+26');
  const tokenName = "Mock Token";
  const tokenSymbol  = "MCK";
  const tokenDecimals = "18";
  const ownerSupply = new web3.BigNumber('3e+26');

  // To send the right amount of tokens, taking in account number of decimals.
  const decimalsMul = new web3.BigNumber('1e+18');

  beforeEach(async () => {
    token = await Token.new();
  });

  it('has correct totalSupply after construction', async () => {
    const actualSupply = await token.totalSupply();
    assert.equal(actualSupply.toString(), tokenTotalSupply.toString());
  });

  it('has correct token name after construction', async () => {
    const actualName = await token.name();
    assert.equal(actualName, tokenName);
  });

  it('has correct token symbol after construction', async () => {
    const actualSymbol = await token.symbol();
    assert.equal(actualSymbol, tokenSymbol);
  });

  it('has correct token decimals after construction', async () => {
    const actualDecimals = await token.decimals();
    assert.equal(actualDecimals.toString(), tokenDecimals);
  });

  it('has correct owner token balance after construction', async () => {
    const actualBalance = await token.balanceOf(owner);
    assert.equal(actualBalance.toString(), ownerSupply.toString());
  });

  it('recipient and sender have correct balances after transfer', async () => {
    const tokenAmount = decimalsMul.mul(100);
    await token.transfer(recipient, tokenAmount);
    const actualSenderBalance = await token.balanceOf(owner);
    const actualRecipientBalance = await token.balanceOf(recipient);
    assert.equal(actualSenderBalance.toString(), ownerSupply.minus(tokenAmount).toString());
    assert.equal(actualRecipientBalance.toString(), tokenAmount.toString());
  });

  it('emits Transfer event on transfer', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const { logs } = await token.transfer(recipient, tokenAmount);
    const event = logs.find(e => e.event === 'Transfer');
    assert.notEqual(event, undefined);
  });

  it('throws when trying to transfer more than available balance', async () => {
    const moreThanBalance = tokenTotalSupply.plus(1);
    await assertRevert(token.transfer(recipient, moreThanBalance));
  });

  it('returns the correct allowance amount after approval', async () => {
    const tokenAmount = decimalsMul.mul(100);
    await token.approve(recipient, tokenAmount);
    const actualAllowance = await token.allowance(owner, recipient);
    assert.equal(actualAllowance.toString(), tokenAmount.toString());
  });

  it('emits Approval event after approval', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const { logs } = await token.approve(recipient, tokenAmount);
    const event = logs.find(e => e.event === 'Approval');
    assert.notEqual(event, undefined);
  });

  it('reverts if owner wants to reset allowance before setting it to 0 first', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const newTokenAmount = decimalsMul.mul(50);
    await token.approve(recipient, tokenAmount);
    await assertRevert(token.approve(recipient, newTokenAmount));
  });

  it('successfully resets allowance', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const newTokenAmount = decimalsMul.mul(50);
    await token.approve(recipient, tokenAmount);
    await token.approve(recipient, 0);
    await token.approve(recipient, newTokenAmount);
    const actualAllowance = await token.allowance(owner, recipient);
    assert.equal(actualAllowance.toString(), newTokenAmount.toString());
  });

  it('returns correct balances after transfering from another account', async () => {
    const tokenAmount = decimalsMul.mul(100);
    await token.approve(allowedAccount, tokenAmount);
    await token.transferFrom(owner, recipient, tokenAmount, { from: allowedAccount });
    const balanceOwner = await token.balanceOf(owner);
    const balanceRecipient = await token.balanceOf(recipient);
    const balanceAllowedAcc = await token.balanceOf(allowedAccount);
    assert.equal(balanceOwner.toString(), ownerSupply.minus(tokenAmount).toString());
    assert.equal(balanceAllowedAcc.toNumber(), 0);
    assert.equal(balanceRecipient.toNumber(), tokenAmount.toString());
  });

  it('emits Transfer event on transferFrom', async () => {
    const tokenAmount = decimalsMul.mul(100);
    await token.approve(allowedAccount, tokenAmount);
    const { logs } = await token.transferFrom(owner, recipient, tokenAmount,
      { from: allowedAccount });
    const event = logs.find(e => e.event === 'Transfer');
    assert.notEqual(event, undefined);
  });

  it('throws when trying to transferFrom more than allowed amount', async () => {
    const tokenAmountAllowed = decimalsMul.mul(99);
    const tokenAmount = decimalsMul.mul(100);
    await token.approve(allowedAccount, tokenAmountAllowed);
    await assertRevert(token.transferFrom(owner, recipient, tokenAmount, { from: accounts[1] }));
  });

  it('throws an error when trying to transferFrom more than _from has', async () => {
    await token.approve(allowedAccount, ownerSupply.plus(1));
    await assertRevert(token.transferFrom(owner, recipient, ownerSupply.plus(1),
      { from: allowedAccount}));
  });

  it('returns the correct freeze amount after approvalFreeze', async () => {
    const tokenAmount = decimalsMul.mul(100);
    await token.approveFreeze(allowedAccount, tokenAmount);
    const actualFreeze = await token.freezeValue(owner, allowedAccount);
    const actualBalance = await token.balanceOf(owner);
    assert.equal(actualBalance.toString(), ownerSupply.minus(tokenAmount));
    assert.equal(actualFreeze.toString(), tokenAmount.toString());
  });

  it('emits ApprovalFreeze event after approvalFreeze', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const { logs } = await token.approveFreeze(allowedAccount, tokenAmount);
    const event = logs.find(e => e.event === 'ApprovalFreeze');
    assert.notEqual(event, undefined);
  });

  it('throws when trying to approveFreeze more than available balance', async () => {
    const moreThanBalance = tokenTotalSupply.plus(1);
    await assertRevert(token.approveFreeze(allowedAccount, moreThanBalance));
  });

  it('returns the correct freeze amount after multi approveFreeze', async () => {
    const tokenAmount = decimalsMul.mul(100);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await token.approveFreeze(allowedAccount, tokenAmount);
    const actualFreeze = await token.freezeValue(owner, allowedAccount);
    const actualBalance = await token.balanceOf(owner);
    var toalAmount = tokenAmount.plus(tokenAmount);
    assert.equal(actualBalance.toString(), ownerSupply.minus(toalAmount));
    assert.equal(actualFreeze.toString(), toalAmount.toString());
  });

  it('returns the correct freeze amount after revokeApprove', async () => {
    const zero = new web3.BigNumber('0');
    const tokenAmount = decimalsMul.mul(100);
    const revokeAmount = decimalsMul.mul(50);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await token.revokeApprove(owner, revokeAmount, { from: allowedAccount});
    const actualFreeze = await token.freezeValue(owner, allowedAccount);
    const actualBalance = await token.balanceOf(owner);
    assert.equal(actualBalance.toString(), ownerSupply.minus(revokeAmount).toString());
    assert.equal(actualFreeze.toString(), revokeAmount.toString());
  });

  it('throws while revokeApprove invalid amount', async () => {
    const zero = new web3.BigNumber('0');
    const tokenAmount = decimalsMul.mul(100);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await assertRevert(token.revokeApprove(owner, tokenAmount.plus(1), { from: allowedAccount}));
    await assertRevert(token.revokeApprove(owner, zero.minus(2), { from: allowedAccount}));
  });

  it('throws while revokeApprove invalid amount', async () => {
    const zero = new web3.BigNumber('0');
    const tokenAmount = decimalsMul.mul(100);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await assertRevert(token.revokeApprove(owner, tokenAmount.plus(1), { from: allowedAccount}));
  });

  it('returns the correct freeze amount after serial operate', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const transferAmount = decimalsMul.mul(50);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await token.transferFromFreeze(owner, recipient, transferAmount, { from: allowedAccount});
    const actualFreeze = await token.freezeValue(owner, allowedAccount);
    const ownerBalance = await token.balanceOf(owner);
    const recipeBalance = await token.balanceOf(recipient);
    assert.equal(ownerBalance.toString(), ownerSupply.minus(tokenAmount).toString());
    assert.equal(actualFreeze.toString(), transferAmount.toString());
    assert.equal(recipeBalance.toString(), transferAmount.toString());
  });

  it('throws no enough freeze amount while transferFromFreeze', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const transferAmount = tokenAmount.plus(1);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await assertRevert(token.transferFromFreeze(owner, recipient, transferAmount, { from: allowedAccount}));
  });

  it('throws no enough freeze amount while transferFromFreeze condition 2', async () => {
    const tokenAmount = decimalsMul.mul(100);
    const transferAmount = tokenAmount.plus(1);
    await token.approveFreeze(allowedAccount, tokenAmount);
    await assertRevert(token.transferFromFreeze(owner, recipient, transferAmount));
  });

  it('return correct balance by addIssue', async () => {
    const amount = decimalsMul.mul(100);
    await token.addIssue(recipient, amount);
    const recBalance = await token.balanceOf(recipient);
    const tsupply = await token.totalSupply();
    assert.equal(recBalance.toString(), amount.toString());
    assert.equal(tsupply.toString(), tokenTotalSupply.plus(amount).toString());
  });

});
