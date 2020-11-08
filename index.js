const fs = require("fs"),
	  generateAST = require("./ast"),
	  {deepLog, display} = require("./ast/debug");

const result = generateAST(fs.readFileSync(process.argv[2]).toString());
if (result.isError) throw result.error;
// deepLog(result.result);
display(result.result);