module.exports = {
  region: 'us-east-1',
  handler: 'update.handler',
  role: 'arn:aws:iam::199264350009:role/service-role/admin',
  functionName: 'updateCashboxpartySongs',
  timeout: 300,
  memorySize: 128,
  publish: true, // default: false,
  runtime: 'nodejs4.3', // default: 'nodejs4.3',
};
