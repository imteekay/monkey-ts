import { describe, it, expect } from 'vitest';
import { IntegerLiteral, StatementKind } from 'ast';
import { ExpressionKind } from 'ast/base';
import { Lexer } from 'lexer';
import { Parser } from 'parser';
import { checkParserErrors } from './checkParserErrors';

describe('Parser', () => {
  describe('parseProgram', () => {
    it('parses the let statement', () => {
      const input = `
        let x = 5;
        let y = 10;
        let foobar = 10000;
      `;

      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      const errors = parser.getErrors();

      checkParserErrors(errors);

      const tests = [
        { identifier: 'x' },
        { identifier: 'y' },
        { identifier: 'foobar' },
      ];

      tests.forEach(({ identifier }, index) => {
        const statement = program.statements[index];

        if (statement.kind === StatementKind.Let) {
          expect(statement.tokenLiteral()).toEqual('let');
          expect(statement.name.value).toEqual(identifier);
          expect(statement.name.tokenLiteral()).toEqual(identifier);
        }
      });
    });

    it('parses the return statement', () => {
      const input = `
        return 5;
        return 10;
        return 10000;
      `;

      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      const errors = parser.getErrors();

      checkParserErrors(errors);

      const tests = [
        { tokenLiteral: 'return' },
        { tokenLiteral: 'return' },
        { tokenLiteral: 'return' },
      ];

      tests.forEach(({ tokenLiteral }, index) => {
        const statement = program.statements[index];

        if (statement.kind === StatementKind.Return) {
          expect(statement.tokenLiteral()).toEqual(tokenLiteral);
        }
      });
    });

    it('parses an input with error', () => {
      const input = `
        let 123;
        let a;
      `;

      const lexer = new Lexer(input);
      const parser = new Parser(lexer);

      parser.parseProgram();

      const errors = parser.getErrors();
      const expectedErrors = [
        'expected next token to be IDENT, got INT instead',
        'expected next token to be =, got ; instead',
        'no prefix parse function for ; found',
      ];

      errors.forEach((error, index) => {
        expect(error).toEqual(expectedErrors[index]);
      });
    });

    it('parses an identifier expression', () => {
      const input = 'foobar;';

      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      const statements = program.statements;
      const errors = parser.getErrors();
      const statement = statements[0];

      checkParserErrors(errors);

      if (
        statement.kind === StatementKind.Expression &&
        statement.expression.kind === ExpressionKind.Identifier
      ) {
        expect(statements.length).toEqual(1);
        expect(statement.expression.value).toEqual('foobar');
        expect(statement.expression.tokenLiteral()).toEqual('foobar');
      }
    });

    it('parses an integer literal expression', () => {
      const input = '10;';

      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      const statements = program.statements;
      const errors = parser.getErrors();
      const statement = statements[0];

      checkParserErrors(errors);

      if (
        statement.kind === StatementKind.Expression &&
        statement.expression.kind === ExpressionKind.IntegerLiteral
      ) {
        expect(statements.length).toEqual(1);

        const expression = statement.expression;

        expect(expression.value).toEqual(10);
        expect(expression.tokenLiteral()).toEqual('10');
      }
    });

    it('parses prefix expressions', () => {
      type Test = {
        input: string;
        operator: string;
        integerValue: number;
      };

      const tests: Test[] = [
        { input: '!5;', operator: '!', integerValue: 5 },
        { input: '-15;', operator: '-', integerValue: 15 },
      ];

      tests.forEach((test: Test) => {
        const lexer = new Lexer(test.input);
        const parser = new Parser(lexer);
        const program = parser.parseProgram();
        const statements = program.statements;
        const errors = parser.getErrors();
        const statement = statements[0];

        checkParserErrors(errors);

        if (
          statement.kind === StatementKind.Expression &&
          statement.expression.kind === ExpressionKind.Prefix
        ) {
          const expression = statement.expression;
          const rightExpression = expression.right;

          expect(expression.operator).toEqual(test.operator);

          if (rightExpression.kind == ExpressionKind.IntegerLiteral) {
            expect(rightExpression.value).toEqual(test.integerValue);
            expect(rightExpression.tokenLiteral()).toEqual(
              test.integerValue.toString()
            );
          }
        }
      });
    });

    it('parses infix expressions', () => {
      type Test = {
        input: string;
        leftValue: number;
        operator: string;
        rightValue: number;
      };

      const tests: Test[] = [
        { input: '5 + 5;', leftValue: 5, operator: '+', rightValue: 5 },
        { input: '5 - 5;', leftValue: 5, operator: '-', rightValue: 5 },
        { input: '5 * 5;', leftValue: 5, operator: '*', rightValue: 5 },
        { input: '5 / 5;', leftValue: 5, operator: '/', rightValue: 5 },
        { input: '5 > 5;', leftValue: 5, operator: '>', rightValue: 5 },
        { input: '5 < 5;', leftValue: 5, operator: '<', rightValue: 5 },
        { input: '5 == 5;', leftValue: 5, operator: '==', rightValue: 5 },
        { input: '5 != 5;', leftValue: 5, operator: '!=', rightValue: 5 },
      ];

      tests.forEach((test: Test) => {
        const lexer = new Lexer(test.input);
        const parser = new Parser(lexer);
        const program = parser.parseProgram();
        const statements = program.statements;
        const statement = statements[0];
        const errors = parser.getErrors();

        checkParserErrors(errors);

        if (statements.length !== 1) {
          throw new Error(
            `program does not contain 1 statement. got ${statements.length}`
          );
        }

        if (
          statement.kind === StatementKind.Expression &&
          statement.expression.kind === ExpressionKind.Infix
        ) {
          const { expression } = statement;
          const { operator } = expression;

          const left = expression.left as IntegerLiteral;
          const right = expression.right as IntegerLiteral;

          expect(left.value).toEqual(test.leftValue);
          expect(left.tokenLiteral()).toEqual(test.leftValue.toString());

          expect(operator).toEqual(test.operator);

          expect(right.value).toEqual(test.rightValue);
          expect(right.tokenLiteral()).toEqual(test.rightValue.toString());
        }
      });
    });
  });

  it('parses infix expressions with operator precedence', () => {
    type Test = {
      input: string;
      expected: string;
    };

    const tests: Test[] = [
      { input: '-a * b', expected: '((-a) * b)' },
      { input: '!-a', expected: '(!(-a))' },
      { input: 'a + b + c', expected: '((a + b) + c)' },
      { input: 'a + b - c', expected: '((a + b) - c)' },
      { input: 'a * b * c', expected: '((a * b) * c)' },
      { input: 'a * b / c', expected: '((a * b) / c)' },
      { input: 'a + b / c', expected: '(a + (b / c))' },
      {
        input: 'a + b * c + d / e - f',
        expected: '(((a + (b * c)) + (d / e)) - f)',
      },
      { input: '3 + 4; -5 * 5', expected: '(3 + 4)((-5) * 5)' },
      { input: '5 > 4 == 3 < 4', expected: '((5 > 4) == (3 < 4))' },
      { input: '5 < 4 != 3 > 4', expected: '((5 < 4) != (3 > 4))' },
      {
        input: '3 + 4 * 5 == 3 * 1 + 4 * 5',
        expected: '((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))',
      },
    ];

    tests.forEach((test: Test) => {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      const errors = parser.getErrors();
      checkParserErrors(errors);
      expect(program.string()).toEqual(test.expected);
    });
  });
});
