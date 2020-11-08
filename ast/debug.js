const {inspect} = require("util"),
      deepLog = obj => console.log(inspect(obj, {depth: Infinity, colors: true})),
      T = require("./types");

function display(AST) {
    console.log(AST.map(resolve).join("\n"));

    function resolve(thing) {
        if (!thing) return "Nothing";
        const {value, type} = thing;
        switch (type) {
            case T.STATEMENT:
                return `STATEMENT (${value.name}): ${value.args.map(resolve).join(" / ")}`;
            case T.ASSIGNMENT:
                return `ASSIGNMENT ('${value.name}'): ${resolve(value.value)}`;
            case T.STRING:
                return `STRING ('${value}')`;
            case T.BOOLEAN:
                return `BOOLEAN (${value})`;
            case T.NUMBER:
                return `NUMBER (${value})`;
            case T.REFERENCE:
                return `VARIABLE ('${value}')`;
            case T.EXPRESSION:
                return `EXPRESSION: ${value.map(resolve).join(" ")}`;
            case T.OPERATOR:
                return `OPERATOR ('${value}')`;
            case T.BINARY_OPERATION:
                return `BINARY OPERATION: ( ${resolve(value.a)} ) ${resolve(value.op)} ( ${resolve(value.b)} )`;
            case T.BLOCK:
                return `BLOCK ('${value.name}'): (${resolve(value.data)}) {\n${[value.content].flat().map(resolve).map(x => "\t" + x).join("\n")}\n}`;
        }
    }
}

module.exports = {display, deepLog};