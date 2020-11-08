const {inspect} = require("util"),
      deepLog = obj => console.log(inspect(obj, {depth: Infinity, colors: true})),
      T = require("./types");

function display(AST) {
    console.log(AST.map(resolve).join("\n"));

    function resolve(thing, tabs = 0) {
        if (!thing) return "Nothing";
        const {value, type} = thing;
        const tabString = "\t".repeat(tabs);
        switch (type) {
            case T.STATEMENT:
                return tabString + `STATEMENT (${value.name}): ${value.args.map(resolve).join(" / ")}`;
            case T.ASSIGNMENT:
                return tabString + `ASSIGNMENT ('${value.name}'): ${resolve(value.value)}`;
            case T.STRING:
                return tabString + `STRING ('${value}')`;
            case T.BOOLEAN:
                return tabString + `BOOLEAN (${value})`;
            case T.NUMBER:
                return tabString + `NUMBER (${value})`;
            case T.REFERENCE:
                return tabString + `VARIABLE ('${value}')`;
            case T.EXPRESSION:
                return tabString + `EXPRESSION: ${value.map(resolve).join(" ")}`;
            case T.OPERATOR:
                return tabString + `OPERATOR ('${value}')`;
            case T.BINARY_OPERATION:
                return tabString + `BINARY OPERATION: ( ${resolve(value.a)} ) ${resolve(value.op)} ( ${resolve(value.b)} )`;
            case T.BLOCK:
                return tabString + `BLOCK ('${value.name}'): (${resolve(value.data)}) {\n${[value.content].flat().map(x => resolve(x, tabs + 1)).join("\n")}\n${tabString}}`;
        }
    }
}

module.exports = {display, deepLog};