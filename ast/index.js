const A = require("arcsecond"),
	  T = require("./types");

//#region Common

const inside = (char1, char2) => A.between(A.char(char1))(A.char(char2)),
	escapeableBetween = char => inside(char, char)(A.many(A.choice([A.str("\\\\"), A.str("\\" + char), A.anyCharExcept(A.char(char))])).map(a => a.join(""))),
	asType = type => value => ({type, value}),
	peek = A.lookAhead(A.regex(/^./));

const optionalWhitespace = A.many(A.anyOfString(" \t")),
	singleQuotedString = escapeableBetween("'"),
	doubleQuotedString = escapeableBetween('"'),
	variableName = A.regex(/^[a-z_]\w*/i),
	lineFeed = A.many1(A.char("\n")),
	commaSeperated = A.sepBy(A.between(optionalWhitespace)(optionalWhitespace)(A.char(","))),
	commandSeperator = A.choice([A.sequenceOf([A.char(";"), optionalWhitespace, lineFeed]), lineFeed, A.char(";")]);

const string = A.choice([singleQuotedString, doubleQuotedString]).map(asType(T.STRING)),
	boolean = A.regex(/^true|false/i).map(a => a.toLowerCase() === "true").map(asType(T.BOOLEAN)),
	reference = variableName.map(asType(T.REFERENCE)),
	number = A.digits.map(parseInt).map(asType(T.NUMBER));

const primitive = A.choice([string, boolean, reference, number]),
	  operator = A.anyOfString("+-/*^").map(asType(T.OPERATOR));

//#endregion
//#region Expressions

const expression = A.coroutine(function*() {
	const expr = [],
		states = {
			EXPECT_ELEMENT: 0,
			EXPECT_OPERATOR: 1
		};

	let state = states.EXPECT_ELEMENT;

	while (true) {
		if (state === states.EXPECT_ELEMENT) {
			const result = yield A.choice([inside("(", ")")(expression), primitive]);

			expr.push(result);
			state = states.EXPECT_OPERATOR;
			yield optionalWhitespace;
		} else if (state === states.EXPECT_OPERATOR) {
			const result = yield A.possibly(operator);
			yield optionalWhitespace;

			if (result) {
				expr.push(result);
				state = states.EXPECT_ELEMENT;
			} else break;
		}
	}

	return typifyBracketedExpression(expr);
}).map(fixOrder);

function typifyBracketedExpression(expr) {
	return asType(T.EXPRESSION)(expr.map(el => (Array.isArray(el) ? typifyBracketedExpression(el) : el)));
}

function fixOrder(expr) {
	if (expr.type !== "EXPRESSION") return expr;
	if (expr.value.length === 1) return expr.value[0];
	const priorities = {"/": 1, "*": 1, "+": 0, "-": 0};
	let canditateExpression = {priority: -Infinity};

	for (let i = 1; i < expr.value.length; i += 2) {
		const level = priorities[expr.value[i].value];
		if (level > canditateExpression.priority) canditateExpression = {priority: level, a: i - 1, op: expr.value[i], b: i + 1};
	}

	const newExpression = asType(T.EXPRESSION)([
		...expr.value.slice(0, canditateExpression.a),
		asType(T.BINARY_OPERATION)({
			a: fixOrder(expr.value[canditateExpression.a]),
			op: canditateExpression.op,
			b: fixOrder(expr.value[canditateExpression.b])
		}),
		...expr.value.slice(canditateExpression.b + 1)
	]);

	return fixOrder(newExpression);
}

//#endregion
//#region Lines

const argument = A.choice([expression, primitive]),
      manyArguments = commaSeperated(argument);

const command = A.coroutine(function*() {
	const name = (yield A.letters).toLowerCase();
	yield optionalWhitespace;
	const args = yield manyArguments;
	return {name, args};
}).map(asType(T.STATEMENT));

const assignment = A.coroutine(function*() {
	const name = yield variableName;
	yield optionalWhitespace;
	yield A.char("=");
	yield optionalWhitespace;
	const value = yield argument;
	return {name, value};
}).map(asType(T.ASSIGNMENT));

const blockStatement = (name, beforeBlock) => A.coroutine(function*() {
	const blockName = yield A.str(name);
	yield optionalWhitespace;
	const data = yield beforeBlock;
	yield A.optionalWhitespace;
	yield A.char("{");
	yield A.optionalWhitespace;
	const content = [];

	while (true) {
		let nextChar = yield peek;
		if (nextChar === "}") break;
		yield optionalWhitespace;

		nextChar = yield peek;
		if (nextChar === "}") break;
		content.push(yield line);

		yield commandSeperator;
	}

	return {blockName: name, data, content};
}).map(asType(T.BLOCK));

const ifStatement = blockStatement("if", boolean);
const line = A.choice([assignment, command]);
const program = A.sepBy(commandSeperator)(line);
//#endregion

module.exports = function(code) {
	return ifStatement.run(code.replace(/\r\n/g, "\n"));
};
