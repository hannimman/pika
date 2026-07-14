(function (global) {
  'use strict';

  const VERSION = '0.1.0';

  const KEYWORDS = new Set([
    'ACCESS', 'ADD', 'ALL', 'ALTER', 'AND', 'ANY', 'AS', 'ASC', 'AUDIT',
    'BEGIN', 'BETWEEN', 'BODY', 'BY', 'CASE', 'CHECK', 'CLUSTER', 'COLUMN',
    'COMMENT', 'COMPRESS', 'CONNECT', 'CONSTANT', 'CREATE', 'CURRENT', 'CURSOR',
    'DECLARE', 'DEFAULT', 'DELETE', 'DESC', 'DISTINCT', 'DROP', 'ELSE', 'ELSIF',
    'END', 'EXCEPTION', 'EXCLUSIVE', 'EXECUTE', 'EXISTS', 'FALSE', 'FETCH',
    'FILE', 'FOR', 'FORALL', 'FROM', 'FUNCTION', 'GRANT', 'GROUP', 'HAVING',
    'IDENTIFIED', 'IF', 'IMMEDIATE', 'IN', 'INCREMENT', 'INDEX', 'INITIAL',
    'INSERT', 'INTERSECT', 'INTO', 'IS', 'LEVEL', 'LIKE', 'LOCK', 'LONG',
    'LOOP', 'MAXEXTENTS', 'MERGE', 'MINUS', 'MODE', 'MODIFY', 'NESTED', 'NOAUDIT',
    'NOCOMPRESS', 'NOT', 'NOWAIT', 'NULL', 'OF', 'OFFLINE', 'ON', 'ONLINE',
    'OPTION', 'OR', 'ORDER', 'PACKAGE', 'PARTITION', 'PCTFREE', 'PRIOR', 'PRIVILEGES',
    'PROCEDURE', 'PUBLIC', 'RAISE', 'RANGE', 'RAW', 'RENAME', 'RESOURCE', 'RETURN',
    'RETURNING', 'REVOKE', 'ROW', 'ROWID', 'ROWNUM', 'ROWS', 'SELECT', 'SESSION',
    'SET', 'SHARE', 'SIZE', 'START', 'SUCCESSFUL', 'SYNONYM', 'SYSDATE', 'TABLE',
    'THEN', 'TO', 'TRIGGER', 'TRUE', 'TYPE', 'UNION', 'UNIQUE', 'UPDATE', 'USER',
    'VALIDATE', 'VALUES', 'VIEW', 'WHEN', 'WHENEVER', 'WHERE', 'WITH', 'WORK',
    'WRITE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL',
    'USING', 'MATCHED', 'FIRST', 'NEXT', 'ONLY', 'OFFSET', 'PIVOT', 'UNPIVOT',
    'MODEL', 'OVER', 'WITHIN', 'SIBLINGS', 'NULLS', 'LAST', 'KEEP', 'DENSE_RANK',
    'BULK', 'COLLECT', 'LIMIT', 'PIPELINED', 'RESULT_CACHE', 'AUTHID', 'DETERMINISTIC',
    'PARALLEL_ENABLE', 'PRAGMA', 'AUTONOMOUS_TRANSACTION', 'RECORD', 'VARRAY',
    'REF', 'OPEN', 'CLOSE', 'CONTINUE', 'EXIT', 'GOTO', 'REVERSE', 'SAVEPOINT',
    'ROLLBACK', 'COMMIT', 'TRANSACTION', 'READ', 'WRITE', 'WAIT', 'NOWAIT',
    'ANALYZE', 'EXPLAIN', 'PLAN', 'FLASHBACK', 'VERSIONS', 'SAMPLE', 'SEED',
    'CUBE', 'ROLLUP', 'GROUPING', 'SETS', 'LATERAL', 'APPLY', 'JSON_TABLE',
    'MATCH_RECOGNIZE', 'MEASURES', 'PATTERN', 'DEFINE', 'AFTER', 'BEFORE',
    'INSTEAD', 'EACH', 'REFERENCING', 'NEW', 'OLD', 'COMPOUND', 'FOLLOWS',
    'EDITIONABLE', 'NONEDITIONABLE', 'BEQUEATH', 'CURRENT_USER', 'DEFINER',
    'DATE', 'NUMBER', 'VARCHAR2', 'VARCHAR', 'CHAR', 'NCHAR', 'NVARCHAR2', 'CLOB',
    'NCLOB', 'BLOB', 'BFILE', 'TIMESTAMP', 'INTERVAL', 'BOOLEAN', 'PLS_INTEGER',
    'BINARY_INTEGER', 'SIMPLE_INTEGER', 'FLOAT', 'BINARY_FLOAT', 'BINARY_DOUBLE',
    'INVOKER_RIGHTS', 'MEMBER', 'STATIC', 'MAP', 'FINAL', 'INSTANTIABLE',
    'UNDER', 'OVERRIDING', 'CONSTRUCTOR', 'SELF', 'TREAT', 'MULTISET', 'CAST',
    'EMPTY', 'PRESENT', 'ABSENT', 'ERROR', 'ERRORS', 'LOG', 'REJECT', 'UNLIMITED'
  ]);

  const SQLPLUS_COMMANDS = new Set([
    '@', '@@', 'ACCEPT', 'APPEND', 'ARCHIVE', 'BREAK', 'BTITLE', 'CHANGE', 'CLEAR',
    'COLUMN', 'COMPUTE', 'CONNECT', 'CONN', 'COPY', 'DEFINE', 'DEL', 'DESCRIBE',
    'DESC', 'DISCONNECT', 'EDIT', 'EXEC', 'EXECUTE', 'EXIT', 'GET', 'HELP', 'HOST',
    'INPUT', 'LIST', 'PASSWORD', 'PAUSE', 'PRINT', 'PROMPT', 'QUIT', 'RECOVER',
    'REM', 'REMARK', 'REPFOOTER', 'REPHEADER', 'RUN', 'SAVE', 'SET', 'SHOW',
    'SHUTDOWN', 'SPOOL', 'START', 'STARTUP', 'STORE', 'TIMING', 'TTITLE',
    'UNDEFINE', 'VARIABLE', 'VAR', 'WHENEVER'
  ]);

  const TEMPLATE_PATTERN = /(\$\{|#\{|\{\{|\{%|<\/?(?:if|choose|when|otherwise|where|set|foreach|trim)\b)/i;
  const WORD_START_RE = /[A-Za-z_$#]/;
  const WORD_PART_RE = /[A-Za-z0-9_$#]/;
  const DIGIT_RE = /[0-9]/;

  const DEFAULT_OPTIONS = Object.freeze({
    mode: 'canonical',
    indentWidth: 4,
    lineWidth: 100,
    keywordCase: 'upper',
    commaStyle: 'trailing',
    booleanOperatorPosition: 'before',
    maxBlankLines: 1,
    endOfLine: 'preserve',
    verifyTokens: true
  });

  function mergeOptions(options) {
    const merged = Object.assign({}, DEFAULT_OPTIONS, options || {});
    merged.indentWidth = clampNumber(merged.indentWidth, 2, 8, 4);
    merged.lineWidth = clampNumber(merged.lineWidth, 60, 200, 100);
    merged.maxBlankLines = clampNumber(merged.maxBlankLines, 0, 3, 1);
    if (!['canonical', 'conservative'].includes(merged.mode)) merged.mode = 'canonical';
    if (!['upper', 'lower', 'preserve'].includes(merged.keywordCase)) merged.keywordCase = 'upper';
    if (!['leading', 'trailing'].includes(merged.commaStyle)) merged.commaStyle = 'trailing';
    if (!['before', 'after'].includes(merged.booleanOperatorPosition)) merged.booleanOperatorPosition = 'before';
    if (!['preserve', 'lf', 'crlf'].includes(merged.endOfLine)) merged.endOfLine = 'preserve';
    merged.verifyTokens = merged.verifyTokens !== false;
    return merged;
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function isWordStart(ch) {
    return Boolean(ch && WORD_START_RE.test(ch));
  }

  function isWordPart(ch) {
    return Boolean(ch && WORD_PART_RE.test(ch));
  }

  function isDigit(ch) {
    return Boolean(ch && DIGIT_RE.test(ch));
  }

  function normalizeEol(text) {
    return text.replace(/\r\n|\r/g, '\n');
  }

  function detectEol(source) {
    const crlf = (source.match(/\r\n/g) || []).length;
    const lf = (source.match(/(?<!\r)\n/g) || []).length;
    const cr = (source.match(/\r(?!\n)/g) || []).length;
    if (crlf >= lf && crlf >= cr && crlf > 0) return '\r\n';
    if (cr > lf && cr > 0) return '\r';
    return '\n';
  }

  function tokenize(source) {
    const tokens = [];
    let i = 0;
    let line = 1;
    let column = 1;

    function advance(raw) {
      for (let j = 0; j < raw.length; j += 1) {
        const ch = raw[j];
        if (ch === '\r') {
          if (raw[j + 1] === '\n') j += 1;
          line += 1;
          column = 1;
        } else if (ch === '\n') {
          line += 1;
          column = 1;
        } else {
          column += 1;
        }
      }
    }

    function push(type, start, end, error) {
      const raw = source.slice(start, end);
      const token = {
        type,
        raw,
        start,
        end,
        line,
        column,
        endLine: line,
        endColumn: column,
        error: error || null
      };
      advance(raw);
      token.endLine = line;
      token.endColumn = column;
      tokens.push(token);
      i = end;
      return token;
    }

    while (i < source.length) {
      const start = i;
      const ch = source[i];
      const next = source[i + 1];

      if (ch === ' ' || ch === '\t' || ch === '\f' || ch === '\v') {
        let end = i + 1;
        while (end < source.length && /[ \t\f\v]/.test(source[end])) end += 1;
        push('whitespace', start, end);
        continue;
      }

      if (ch === '\r' || ch === '\n') {
        const end = ch === '\r' && next === '\n' ? i + 2 : i + 1;
        push('newline', start, end);
        continue;
      }

      if (ch === '-' && next === '-') {
        let end = i + 2;
        while (end < source.length && source[end] !== '\n' && source[end] !== '\r') end += 1;
        push('line_comment', start, end);
        continue;
      }

      if (ch === '/' && next === '*') {
        let end = i + 2;
        while (end < source.length && !(source[end] === '*' && source[end + 1] === '/')) end += 1;
        if (end < source.length) {
          end += 2;
          push(source[i + 2] === '+' ? 'hint' : 'block_comment', start, end);
        } else {
          push(source[i + 2] === '+' ? 'hint' : 'block_comment', start, source.length, 'Unterminated block comment');
        }
        continue;
      }

      const qPrefixLength = getQQuotePrefixLength(source, i);
      if (qPrefixLength > 0) {
        const quoteIndex = i + qPrefixLength - 1;
        const openIndex = quoteIndex + 1;
        const open = source[openIndex];
        const close = ({ '[': ']', '{': '}', '(': ')', '<': '>' })[open] || open;
        let end = openIndex + 1;
        let found = false;
        while (end < source.length - 1) {
          if (source[end] === close && source[end + 1] === "'") {
            end += 2;
            found = true;
            break;
          }
          end += 1;
        }
        push('q_string', start, found ? end : source.length, found ? null : 'Unterminated alternative-quoted string');
        continue;
      }

      const nationalString = (ch === 'N' || ch === 'n') && next === "'" && !isWordPart(source[i - 1]);
      if (ch === "'" || nationalString) {
        let end = nationalString ? i + 2 : i + 1;
        let found = false;
        while (end < source.length) {
          if (source[end] === "'") {
            if (source[end + 1] === "'") {
              end += 2;
              continue;
            }
            end += 1;
            found = true;
            break;
          }
          end += 1;
        }
        push('string', start, found ? end : source.length, found ? null : 'Unterminated string literal');
        continue;
      }

      if (ch === '"') {
        let end = i + 1;
        let found = false;
        while (end < source.length) {
          if (source[end] === '"') {
            if (source[end + 1] === '"') {
              end += 2;
              continue;
            }
            end += 1;
            found = true;
            break;
          }
          end += 1;
        }
        push('quoted_identifier', start, found ? end : source.length, found ? null : 'Unterminated quoted identifier');
        continue;
      }

      if (ch === '&') {
        let end = i + (next === '&' ? 2 : 1);
        while (end < source.length && isWordPart(source[end])) end += 1;
        if (end > i + (next === '&' ? 2 : 1)) {
          push('substitution', start, end);
          continue;
        }
      }

      if (ch === ':' && next !== '=' && (isWordStart(next) || isDigit(next))) {
        let end = i + 2;
        while (end < source.length && isWordPart(source[end])) end += 1;
        push('bind', start, end);
        continue;
      }

      if (isWordStart(ch)) {
        let end = i + 1;
        while (end < source.length && isWordPart(source[end])) end += 1;
        push('word', start, end);
        continue;
      }

      if (isDigit(ch) || (ch === '.' && isDigit(next))) {
        let end = i;
        if (source[end] === '.') end += 1;
        while (end < source.length && isDigit(source[end])) end += 1;
        if (source[end] === '.' && source[end + 1] !== '.') {
          end += 1;
          while (end < source.length && isDigit(source[end])) end += 1;
        }
        if (source[end] === 'e' || source[end] === 'E') {
          let expEnd = end + 1;
          if (source[expEnd] === '+' || source[expEnd] === '-') expEnd += 1;
          const expStart = expEnd;
          while (expEnd < source.length && isDigit(source[expEnd])) expEnd += 1;
          if (expEnd > expStart) end = expEnd;
        }
        push('number', start, end);
        continue;
      }

      const three = source.slice(i, i + 3);
      const two = source.slice(i, i + 2);
      if (three === '(+)') {
        push('operator', start, i + 3);
        continue;
      }
      if ([':=', '=>', '||', '<=', '>=', '<>', '!=', '^=', '**', '..', '<<', '>>', '~='].includes(two)) {
        push('operator', start, i + 2);
        continue;
      }

      if ('(),;.'.includes(ch)) {
        push('punctuation', start, i + 1);
        continue;
      }

      if ('+-*/%=<>|^~'.includes(ch)) {
        push('operator', start, i + 1);
        continue;
      }

      push('other', start, i + 1);
    }

    return tokens;
  }

  function getQQuotePrefixLength(source, index) {
    const previous = source[index - 1];
    if (isWordPart(previous)) return 0;
    const a = source[index];
    const b = source[index + 1];
    const c = source[index + 2];
    if ((a === 'q' || a === 'Q') && b === "'" && c) return 2;
    if ((a === 'n' || a === 'N') && (b === 'q' || b === 'Q') && c === "'" && source[index + 3]) return 3;
    return 0;
  }

  function splitLines(source) {
    const lines = [];
    let offset = 0;
    while (offset < source.length) {
      let end = offset;
      while (end < source.length && source[end] !== '\r' && source[end] !== '\n') end += 1;
      let eol = '';
      if (source[end] === '\r' && source[end + 1] === '\n') eol = '\r\n';
      else if (source[end] === '\r') eol = '\r';
      else if (source[end] === '\n') eol = '\n';
      lines.push({
        content: source.slice(offset, end),
        eol,
        raw: source.slice(offset, end + eol.length),
        start: offset,
        end: end + eol.length
      });
      offset = end + eol.length;
    }
    if (source.length === 0) return [];
    return lines;
  }

  function segmentScript(source) {
    const lines = splitLines(source);
    const segments = [];
    const tracker = {
      lexical: { mode: 'normal', qClose: null },
      boundary: true,
      plsql: false,
      parenDepth: 0,
      headWords: []
    };
    let fmtOff = false;
    let protectedLineCount = 0;
    let sqlPlusCommandCount = 0;

    function append(type, text, reason) {
      if (!text) return;
      const last = segments[segments.length - 1];
      if (last && last.type === type && last.reason === reason) last.text += text;
      else segments.push({ type, text, reason: reason || null });
    }

    for (const line of lines) {
      const trimmed = line.content.trim();
      const modeAtStart = tracker.lexical.mode;
      const fmtOffDirective = modeAtStart === 'normal' && /^--\s*orafmt\s*:\s*off\b/i.test(trimmed);
      const fmtOnDirective = modeAtStart === 'normal' && /^--\s*orafmt\s*:\s*on\b/i.test(trimmed);

      if (fmtOffDirective) fmtOff = true;

      if (fmtOff) {
        append('protected', line.raw, 'formatter-disabled');
        protectedLineCount += 1;
        scanCodeLine(line.content, tracker);
        if (fmtOnDirective) {
          fmtOff = false;
          tracker.boundary = true;
          tracker.plsql = false;
          tracker.headWords = [];
          tracker.parenDepth = 0;
        }
        continue;
      }

      const slashLine = modeAtStart === 'normal' && /^\/\s*(?:--.*)?$/.test(trimmed);
      const command = modeAtStart === 'normal' && tracker.boundary ? getSqlPlusCommand(trimmed) : null;

      if (slashLine) {
        append('protected', line.raw, 'sqlplus-slash');
        protectedLineCount += 1;
        sqlPlusCommandCount += 1;
        tracker.boundary = true;
        tracker.plsql = false;
        tracker.parenDepth = 0;
        tracker.headWords = [];
        continue;
      }

      if (command) {
        append('protected', line.raw, 'sqlplus-command');
        protectedLineCount += 1;
        sqlPlusCommandCount += 1;
        tracker.boundary = true;
        continue;
      }

      append('code', line.raw, null);
      scanCodeLine(line.content, tracker);
    }

    return { segments, protectedLineCount, sqlPlusCommandCount };
  }

  function getSqlPlusCommand(trimmedLine) {
    if (!trimmedLine || trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) return null;
    if (trimmedLine.startsWith('@@')) return '@@';
    if (trimmedLine.startsWith('@')) return '@';
    const match = trimmedLine.match(/^([A-Za-z]+)/);
    if (!match) return null;
    const command = match[1].toUpperCase();
    return SQLPLUS_COMMANDS.has(command) ? command : null;
  }

  function scanCodeLine(line, tracker) {
    let i = 0;
    let sawCode = false;

    function beginStatementIfNeeded() {
      if (tracker.boundary) {
        tracker.boundary = false;
        tracker.headWords = [];
        tracker.parenDepth = 0;
      }
      sawCode = true;
    }

    function considerPlsql() {
      const h = tracker.headWords;
      if (h[0] === 'DECLARE' || h[0] === 'BEGIN') {
        tracker.plsql = true;
        return;
      }
      if (h[0] !== 'CREATE') return;
      let p = 1;
      if (h[p] === 'OR' && h[p + 1] === 'REPLACE') p += 2;
      if (h[p] === 'EDITIONABLE' || h[p] === 'NONEDITIONABLE') p += 1;
      const type = h[p];
      const next = h[p + 1];
      if (['PROCEDURE', 'FUNCTION', 'TRIGGER', 'PACKAGE'].includes(type)) tracker.plsql = true;
      if (type === 'TYPE' && next === 'BODY') tracker.plsql = true;
    }

    while (i < line.length) {
      const ch = line[i];
      const next = line[i + 1];

      if (tracker.lexical.mode === 'single') {
        if (ch === "'" && next === "'") i += 2;
        else if (ch === "'") {
          tracker.lexical.mode = 'normal';
          i += 1;
        } else i += 1;
        continue;
      }

      if (tracker.lexical.mode === 'double') {
        if (ch === '"' && next === '"') i += 2;
        else if (ch === '"') {
          tracker.lexical.mode = 'normal';
          i += 1;
        } else i += 1;
        continue;
      }

      if (tracker.lexical.mode === 'block') {
        if (ch === '*' && next === '/') {
          tracker.lexical.mode = 'normal';
          i += 2;
        } else i += 1;
        continue;
      }

      if (tracker.lexical.mode === 'q') {
        if (ch === tracker.lexical.qClose && next === "'") {
          tracker.lexical.mode = 'normal';
          tracker.lexical.qClose = null;
          i += 2;
        } else i += 1;
        continue;
      }

      if (ch === '-' && next === '-') break;
      if (ch === '/' && next === '*') {
        tracker.lexical.mode = 'block';
        i += 2;
        continue;
      }

      const qPrefixLength = getQQuotePrefixLength(line, i);
      if (qPrefixLength > 0) {
        const quoteIndex = i + qPrefixLength - 1;
        const open = line[quoteIndex + 1];
        tracker.lexical.mode = 'q';
        tracker.lexical.qClose = ({ '[': ']', '{': '}', '(': ')', '<': '>' })[open] || open;
        i = quoteIndex + 2;
        continue;
      }

      const nationalString = (ch === 'N' || ch === 'n') && next === "'" && !isWordPart(line[i - 1]);
      if (ch === "'" || nationalString) {
        tracker.lexical.mode = 'single';
        i += nationalString ? 2 : 1;
        continue;
      }
      if (ch === '"') {
        tracker.lexical.mode = 'double';
        i += 1;
        continue;
      }
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      if (isWordStart(ch)) {
        beginStatementIfNeeded();
        let end = i + 1;
        while (end < line.length && isWordPart(line[end])) end += 1;
        if (tracker.headWords.length < 8) {
          tracker.headWords.push(line.slice(i, end).toUpperCase());
          considerPlsql();
        }
        i = end;
        continue;
      }
      if (ch === '(') {
        beginStatementIfNeeded();
        tracker.parenDepth += 1;
        i += 1;
        continue;
      }
      if (ch === ')') {
        beginStatementIfNeeded();
        tracker.parenDepth = Math.max(0, tracker.parenDepth - 1);
        i += 1;
        continue;
      }
      if (ch === ';') {
        beginStatementIfNeeded();
        if (!tracker.plsql && tracker.parenDepth === 0) {
          tracker.boundary = true;
          tracker.headWords = [];
        }
        i += 1;
        continue;
      }
      beginStatementIfNeeded();
      i += 1;
    }

    if (!sawCode && tracker.boundary) tracker.headWords = [];
  }

  function significantTokens(tokens) {
    const result = [];
    let newlines = 0;
    let spaces = false;
    for (const token of tokens) {
      if (token.type === 'whitespace') {
        spaces = true;
        continue;
      }
      if (token.type === 'newline') {
        newlines += 1;
        spaces = false;
        continue;
      }
      result.push(Object.assign({}, token, {
        newlinesBefore: newlines,
        spacesBefore: spaces
      }));
      newlines = 0;
      spaces = false;
    }
    result.trailingNewlines = newlines;
    return result;
  }

  class Writer {
    constructor(options) {
      this.indentWidth = options.indentWidth;
      this.maxBlankLines = options.maxBlankLines;
      this.lines = [];
      this.current = '';
      this.indentLevel = 0;
      this.pendingSpace = false;
      this.suppressIndentOnce = false;
    }

    get hasContent() {
      return this.current.trim().length > 0;
    }

    get currentLength() {
      return this.current.length;
    }

    get lastChar() {
      return this.current.length ? this.current[this.current.length - 1] : '';
    }

    setIndent(level) {
      this.indentLevel = Math.max(0, Math.floor(level));
    }

    addIndent(delta) {
      this.setIndent(this.indentLevel + delta);
    }

    ensureIndent() {
      if (!this.current && !this.suppressIndentOnce) {
        this.current = ' '.repeat(this.indentLevel * this.indentWidth);
      }
      this.suppressIndentOnce = false;
    }

    space() {
      if (this.hasContent) this.pendingSpace = true;
    }

    cancelSpace() {
      this.pendingSpace = false;
    }

    word(text) {
      this.ensureIndent();
      if (this.pendingSpace && this.current && !/[\s.(]$/.test(this.current)) this.current += ' ';
      else if (!this.pendingSpace && this.current && needsImplicitSpace(this.lastChar, text[0])) this.current += ' ';
      this.pendingSpace = false;
      this.current += text;
    }

    atom(text) {
      this.word(text);
    }

    symbol(text) {
      this.ensureIndent();
      this.pendingSpace = false;
      if (this.current.trim().length > 0) this.current = this.current.replace(/[ \t]+$/, '');
      this.current += text;
    }

    operator(text, unary) {
      this.ensureIndent();
      if (unary) {
        this.pendingSpace = false;
        if (this.current.trim().length > 0) this.current = this.current.replace(/[ \t]+$/, '');
        this.current += text;
      } else {
        if (this.current.trim().length > 0) this.current = this.current.replace(/[ \t]+$/, '');
        if (this.current && !/\s$/.test(this.current)) this.current += ' ';
        this.current += text;
        this.pendingSpace = true;
      }
    }

    rawToken(raw, spaceBefore) {
      const normalized = normalizeEol(raw);
      if (spaceBefore) this.space();
      this.ensureIndent();
      if (this.pendingSpace && this.current && !/\s$/.test(this.current)) this.current += ' ';
      this.pendingSpace = false;
      const parts = normalized.split('\n');
      this.current += parts[0];
      for (let i = 1; i < parts.length; i += 1) {
        this.lines.push(this.current.replace(/[ \t]+$/, ''));
        this.current = parts[i];
        this.suppressIndentOnce = true;
      }
    }

    line(force) {
      this.pendingSpace = false;
      const value = this.current.replace(/[ \t]+$/, '');
      if (value.trim().length > 0 || force) {
        this.lines.push(value);
      }
      this.current = '';
    }

    blankLine() {
      this.line(false);
      let blanks = 0;
      for (let i = this.lines.length - 1; i >= 0 && this.lines[i] === ''; i -= 1) blanks += 1;
      if (blanks < this.maxBlankLines) this.lines.push('');
    }

    toString() {
      this.line(false);
      while (this.lines.length && this.lines[this.lines.length - 1] === '') this.lines.pop();
      return this.lines.join('\n');
    }
  }

  function needsImplicitSpace(lastChar, firstChar) {
    if (!lastChar || !firstChar) return false;
    return /[A-Za-z0-9_$#"'\]\)]/.test(lastChar) && /[A-Za-z0-9_$#"']/.test(firstChar);
  }

  function applyKeywordCase(raw, options) {
    const upper = raw.toUpperCase();
    if (!KEYWORDS.has(upper)) return raw;
    if (options.keywordCase === 'upper') return upper;
    if (options.keywordCase === 'lower') return upper.toLowerCase();
    return raw;
  }

  function upperToken(token) {
    return token && token.type === 'word' ? token.raw.toUpperCase() : '';
  }

  function isWord(token, word) {
    return token && token.type === 'word' && token.raw.toUpperCase() === word;
  }

  function nextNonComment(tokens, index) {
    for (let i = index + 1; i < tokens.length; i += 1) {
      if (!['line_comment', 'block_comment'].includes(tokens[i].type)) return tokens[i];
    }
    return null;
  }

  function isAtomToken(token) {
    return ['word', 'number', 'string', 'q_string', 'quoted_identifier', 'bind', 'substitution'].includes(token.type);
  }

  function detectClause(tokens, index) {
    const a = upperToken(tokens[index]);
    const b = upperToken(tokens[index + 1]);
    const c = upperToken(tokens[index + 2]);
    const d = upperToken(tokens[index + 3]);

    if (a === 'ORDER' && b === 'SIBLINGS' && c === 'BY') return { kind: 'ORDER_BY', count: 3 };
    if (a === 'GROUP' && b === 'BY') return { kind: 'GROUP_BY', count: 2 };
    if (a === 'ORDER' && b === 'BY') return { kind: 'ORDER_BY', count: 2 };
    if (a === 'CONNECT' && b === 'BY') return { kind: 'CONNECT_BY', count: 2 };
    if (a === 'START' && b === 'WITH') return { kind: 'START_WITH', count: 2 };
    if (a === 'FOR' && b === 'UPDATE') return { kind: 'FOR_UPDATE', count: 2 };
    if (a === 'RETURNING' && b === 'INTO') return { kind: 'RETURNING_INTO', count: 2 };
    if (a === 'UNION' && b === 'ALL') return { kind: 'SET_OPERATOR', count: 2 };
    if (['UNION', 'INTERSECT', 'MINUS'].includes(a)) return { kind: 'SET_OPERATOR', count: 1 };
    if (a === 'LEFT' && b === 'OUTER' && c === 'JOIN') return { kind: 'JOIN', count: 3 };
    if (a === 'RIGHT' && b === 'OUTER' && c === 'JOIN') return { kind: 'JOIN', count: 3 };
    if (a === 'FULL' && b === 'OUTER' && c === 'JOIN') return { kind: 'JOIN', count: 3 };
    if (['LEFT', 'RIGHT', 'FULL', 'INNER', 'CROSS', 'NATURAL'].includes(a) && b === 'JOIN') return { kind: 'JOIN', count: 2 };
    if (a === 'JOIN') return { kind: 'JOIN', count: 1 };
    if (a === 'CROSS' && b === 'APPLY') return { kind: 'JOIN', count: 2 };
    if (a === 'OUTER' && b === 'APPLY') return { kind: 'JOIN', count: 2 };
    if (a === 'WHEN' && b === 'NOT' && c === 'MATCHED' && d === 'THEN') return { kind: 'MERGE_WHEN', count: 4 };
    if (a === 'WHEN' && b === 'MATCHED' && c === 'THEN') return { kind: 'MERGE_WHEN', count: 3 };
    if (a === 'FETCH' && ['FIRST', 'NEXT'].includes(b)) return { kind: 'FETCH', count: 2 };
    if (a === 'PARTITION' && b === 'BY') return { kind: 'PARTITION_BY', count: 2 };
    if (a === 'WITHIN' && b === 'GROUP') return { kind: 'WITHIN_GROUP', count: 2 };
    if (a === 'BULK' && b === 'COLLECT' && c === 'INTO') return { kind: 'BULK_COLLECT_INTO', count: 3 };
    if (a === 'BULK' && b === 'COLLECT') return { kind: 'BULK_COLLECT', count: 2 };
    return null;
  }

  function writePhrase(writer, tokens, index, count, options) {
    for (let j = 0; j < count; j += 1) {
      if (j > 0) writer.space();
      writer.word(applyKeywordCase(tokens[index + j].raw, options));
    }
  }

  function formatCodeSegment(source, options) {
    const diagnostics = [];
    if (!source.trim()) return { output: source, diagnostics, tokenCount: 0, formatted: false };
    if (TEMPLATE_PATTERN.test(source)) {
      diagnostics.push({
        severity: 'warning',
        code: 'TEMPLATE_UNSUPPORTED',
        message: 'Template syntax was detected. This segment was preserved unchanged.'
      });
      return { output: source, diagnostics, tokenCount: 0, formatted: false };
    }

    const tokens = tokenize(source);
    const lexicalErrors = tokens.filter((token) => token.error);
    if (lexicalErrors.length) {
      diagnostics.push(...lexicalErrors.map((token) => ({
        severity: 'error',
        code: 'LEXICAL_ERROR',
        line: token.line,
        column: token.column,
        message: token.error
      })));
      return { output: source, diagnostics, tokenCount: tokens.length, formatted: false };
    }

    const significant = significantTokens(tokens);
    const writer = new Writer(options);
    const state = {
      parenDepth: 0,
      parenStack: [],
      currentQuery: null,
      blockStack: [],
      pendingControl: null,
      betweenDepths: new Set(),
      clause: null,
      clauseDepth: 0,
      statementStart: true,
      lastToken: null,
      lastKeyword: null,
      plsqlHeaderType: null,
      plsqlHeaderBase: null,
      pendingRoutineBase: null,
      pendingDmlHint: null,
      mergeAction: false,
      mergeActionKind: null
    };

    function canonical() {
      return options.mode === 'canonical';
    }

    function currentBaseIndent() {
      return state.currentQuery ? state.currentQuery.baseIndent : writer.indentLevel;
    }

    function shouldHonorOriginalBreak(token) {
      return options.mode === 'conservative' && token.newlinesBefore > 0;
    }

    function originalBreak(token) {
      if (!shouldHonorOriginalBreak(token)) return;
      writer.line(false);
      if (token.newlinesBefore > 1 && options.maxBlankLines > 0) writer.blankLine();
    }

    function ensureQuery() {
      if (!state.currentQuery) {
        state.currentQuery = {
          baseIndent: writer.indentLevel,
          depth: state.parenDepth,
          clause: null,
          clauseDepth: state.parenDepth,
          contentIndent: writer.indentLevel + 1
        };
      }
      return state.currentQuery;
    }

    function startClause(name, phraseCount, index, style) {
      const query = ensureQuery();
      const base = name === 'ON' ? query.baseIndent + 1 : query.baseIndent;
      const needsBreak = canonical() || significant[index].newlinesBefore > 0 || writer.currentLength > options.lineWidth;
      if (needsBreak && writer.hasContent) writer.line(false);
      writer.setIndent(base);
      writePhrase(writer, significant, index, phraseCount, options);
      query.clause = name;
      query.clauseDepth = state.parenDepth;
      query.contentIndent = base + 1;
      state.clause = name;
      state.clauseDepth = state.parenDepth;
      if (style === 'newline-content' && canonical()) {
        writer.line(false);
        writer.setIndent(query.contentIndent);
      } else {
        writer.space();
        writer.setIndent(query.contentIndent);
      }
    }

    function breakForBoolean(operatorText) {
      const query = state.currentQuery;
      const indent = query ? query.contentIndent : writer.indentLevel;
      if (options.booleanOperatorPosition === 'after') {
        writer.space();
        writer.word(operatorText);
        writer.line(false);
        writer.setIndent(indent);
      } else {
        writer.line(false);
        writer.setIndent(indent);
        writer.word(operatorText);
        writer.space();
      }
    }

    function pushBlock(type, base) {
      state.blockStack.push({ type, base });
    }

    function popBlock(preferredTypes) {
      if (!state.blockStack.length) return null;
      if (!preferredTypes || !preferredTypes.length) return state.blockStack.pop();
      for (let i = state.blockStack.length - 1; i >= 0; i -= 1) {
        if (preferredTypes.includes(state.blockStack[i].type)) {
          const block = state.blockStack[i];
          state.blockStack.splice(i, 1);
          return block;
        }
      }
      return state.blockStack.pop();
    }

    function handleEndPhrase(index) {
      const next = upperToken(significant[index + 1]);
      const count = ['IF', 'LOOP', 'CASE'].includes(next) ? 2 : 1;
      const preferred = next === 'IF' ? ['IF'] : next === 'LOOP' ? ['LOOP'] : next === 'CASE' ? ['CASE'] : ['BEGIN', 'DECLARE', 'CASE'];
      const block = popBlock(preferred);
      if (block) writer.setIndent(block.base);
      if (writer.hasContent) writer.line(false);
      writePhrase(writer, significant, index, count, options);
      state.pendingControl = null;
      return count;
    }

    for (let i = 0; i < significant.length; i += 1) {
      const token = significant[i];
      const rawUpper = upperToken(token);
      const next = significant[i + 1];
      const nextUpper = upperToken(next);
      const previous = significant[i - 1];
      const previousUpper = upperToken(previous);

      if (options.mode === 'conservative') originalBreak(token);
      else if (token.newlinesBefore > 1 && state.statementStart && options.maxBlankLines > 0) writer.blankLine();

      if (token.type === 'line_comment') {
        writer.rawToken(token.raw, writer.hasContent);
        writer.line(false);
        state.lastToken = token;
        continue;
      }

      if (token.type === 'block_comment' || token.type === 'hint') {
        const multiline = /\r|\n/.test(token.raw);
        if (token.type === 'hint' && state.pendingDmlHint) {
          writer.rawToken(token.raw, true);
          writer.line(false);
          if (state.currentQuery) writer.setIndent(state.currentQuery.contentIndent);
          state.pendingDmlHint = null;
          state.lastToken = token;
          continue;
        }
        if (multiline && writer.hasContent && token.newlinesBefore > 0) writer.line(false);
        writer.rawToken(token.raw, writer.hasContent);
        if (multiline) writer.line(false);
        else writer.space();
        state.lastToken = token;
        continue;
      }

      if (token.type === 'punctuation') {
        if (token.raw === '(') {
          const subquery = ['SELECT', 'WITH'].includes(nextUpper);
          const functionLike = previous && (isAtomToken(previous) || previous.raw === ')') && !['IN', 'EXISTS', 'VALUES', 'OVER', 'USING', 'ON', 'AS', 'INSERT'].includes(previousUpper);
          const spaceBeforeParen = !functionLike && previous && !['(', '.', ','].includes(previous.raw);
          if (spaceBeforeParen) {
            writer.space();
            writer.word('(');
          } else writer.symbol('(');
          state.parenStack.push({
            subquery,
            outerQuery: state.currentQuery,
            baseIndent: writer.indentLevel,
            depth: state.parenDepth
          });
          state.parenDepth += 1;
          if (subquery) {
            writer.line(false);
            writer.addIndent(1);
            state.currentQuery = null;
            state.clause = null;
            state.statementStart = true;
          }
          state.lastToken = token;
          continue;
        }

        if (token.raw === ')') {
          const frame = state.parenStack.pop();
          state.parenDepth = Math.max(0, state.parenDepth - 1);
          if (frame && frame.subquery) {
            if (writer.hasContent) writer.line(false);
            writer.setIndent(frame.baseIndent);
            writer.symbol(')');
            state.currentQuery = frame.outerQuery;
            state.clause = state.currentQuery ? state.currentQuery.clause : null;
          } else {
            writer.symbol(')');
          }
          state.betweenDepths.delete(state.parenDepth + 1);
          state.lastToken = token;
          continue;
        }

        if (token.raw === ',') {
          const query = state.currentQuery;
          const atClauseLevel = query && state.parenDepth === query.clauseDepth;
          const breakableClause = query && ['SELECT', 'WITH', 'GROUP_BY', 'ORDER_BY', 'FROM', 'SET', 'VALUES', 'RETURNING_INTO'].includes(query.clause);
          const shouldBreak = canonical() && atClauseLevel && breakableClause;
          if (options.commaStyle === 'leading' && shouldBreak) {
            writer.line(false);
            writer.setIndent(query.contentIndent);
            writer.symbol(',');
            writer.space();
          } else {
            writer.symbol(',');
            if (shouldBreak || writer.currentLength > options.lineWidth) {
              writer.line(false);
              if (query) writer.setIndent(query.contentIndent);
            } else writer.space();
          }
          state.lastToken = token;
          continue;
        }

        if (token.raw === ';') {
          writer.symbol(';');
          const completedQueryBase = state.currentQuery ? state.currentQuery.baseIndent : null;
          writer.line(false);
          if (completedQueryBase !== null) writer.setIndent(completedQueryBase);
          state.currentQuery = null;
          state.clause = null;
          state.statementStart = true;
          state.betweenDepths.clear();
          state.mergeAction = false;
          state.mergeActionKind = null;
          state.lastToken = token;
          continue;
        }

        if (token.raw === '.') {
          writer.symbol('.');
          state.lastToken = token;
          continue;
        }
      }

      if (token.type === 'operator') {
        const unary = ['+', '-'].includes(token.raw) && (!previous || previous.type === 'operator' || ['(', ',', ':=', '=>'].includes(previous.raw) || ['THEN', 'ELSE', 'WHEN', 'RETURN', 'BY'].includes(previousUpper));
        if (token.raw === '(+)') writer.symbol(token.raw);
        else if (token.raw === '%' && previous && next && isAtomToken(previous) && next.type === 'word') writer.symbol('%');
        else if (token.raw === '*' && previous && previous.raw === '.') writer.symbol('*');
        else if (token.raw === '*' && previous && previous.raw === '(' && next && next.raw === ')') writer.symbol('*');
        else if (token.raw === '..') writer.symbol('..');
        else writer.operator(token.raw, unary);
        state.lastToken = token;
        continue;
      }

      if (token.type !== 'word') {
        writer.atom(token.raw);
        writer.space();
        state.statementStart = false;
        state.lastToken = token;
        continue;
      }

      const clause = detectClause(significant, i);

      if (rawUpper === 'END') {
        const count = handleEndPhrase(i);
        i += count - 1;
        state.lastKeyword = 'END';
        state.lastToken = significant[i];
        continue;
      }

      if (rawUpper === 'DECLARE') {
        const base = writer.indentLevel;
        if (writer.hasContent) writer.line(false);
        writer.word(applyKeywordCase(token.raw, options));
        writer.line(false);
        pushBlock('DECLARE', base);
        writer.setIndent(base + 1);
        state.statementStart = false;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'BEGIN') {
        let base = state.pendingRoutineBase !== null ? state.pendingRoutineBase : writer.indentLevel;
        if (state.pendingRoutineBase !== null) state.pendingRoutineBase = null;
        const top = state.blockStack[state.blockStack.length - 1];
        if (top && top.type === 'DECLARE') {
          base = top.base;
          top.type = 'BEGIN';
        } else {
          pushBlock('BEGIN', base);
        }
        if (writer.hasContent) writer.line(false);
        writer.setIndent(base);
        writer.word(applyKeywordCase(token.raw, options));
        writer.line(false);
        writer.setIndent(base + 1);
        state.statementStart = false;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (['PROCEDURE', 'FUNCTION', 'TRIGGER'].includes(rawUpper)) {
        if (writer.hasContent) writer.line(false);
        const base = writer.indentLevel;
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.plsqlHeaderType = 'ROUTINE';
        state.plsqlHeaderBase = base;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'PACKAGE') {
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.plsqlHeaderType = 'PACKAGE';
        state.plsqlHeaderBase = writer.indentLevel;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (['AS', 'IS'].includes(rawUpper) && state.plsqlHeaderType) {
        writer.word(applyKeywordCase(token.raw, options));
        writer.line(false);
        if (state.plsqlHeaderType === 'PACKAGE') {
          const base = state.plsqlHeaderBase === null ? writer.indentLevel : state.plsqlHeaderBase;
          pushBlock('PACKAGE', base);
          writer.setIndent(base + 1);
        } else {
          const base = state.plsqlHeaderBase === null ? writer.indentLevel : state.plsqlHeaderBase;
          state.pendingRoutineBase = base;
          writer.setIndent(base + 1);
        }
        state.plsqlHeaderType = null;
        state.plsqlHeaderBase = null;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'EXCEPTION') {
        const beginBlock = [...state.blockStack].reverse().find((block) => block.type === 'BEGIN');
        const base = beginBlock ? beginBlock.base : Math.max(0, writer.indentLevel - 1);
        if (writer.hasContent) writer.line(false);
        writer.setIndent(base);
        writer.word(applyKeywordCase(token.raw, options));
        writer.line(false);
        writer.setIndent(base + 1);
        state.clause = 'EXCEPTION';
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'IF' && previousUpper !== 'END') {
        if (writer.hasContent && canonical()) writer.line(false);
        const base = writer.indentLevel;
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.pendingControl = { type: 'IF', base };
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'ELSIF') {
        const block = [...state.blockStack].reverse().find((item) => item.type === 'IF');
        const base = block ? block.base : Math.max(0, writer.indentLevel - 1);
        if (writer.hasContent) writer.line(false);
        writer.setIndent(base);
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.pendingControl = { type: 'IF_REOPEN', base };
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'ELSE') {
        const block = [...state.blockStack].reverse().find((item) => item.type === 'IF' || item.type === 'CASE');
        const base = block ? block.base : Math.max(0, writer.indentLevel - 1);
        if (writer.hasContent) writer.line(false);
        writer.setIndent(block && block.type === 'CASE' ? base + 1 : base);
        writer.word(applyKeywordCase(token.raw, options));
        if (block && block.type === 'IF') {
          writer.line(false);
          writer.setIndent(base + 1);
        } else writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'THEN') {
        writer.space();
        writer.word(applyKeywordCase(token.raw, options));
        if (state.pendingControl && state.pendingControl.type === 'IF') {
          const base = state.pendingControl.base;
          pushBlock('IF', base);
          writer.line(false);
          writer.setIndent(base + 1);
          state.pendingControl = null;
        } else if (state.pendingControl && state.pendingControl.type === 'IF_REOPEN') {
          const base = state.pendingControl.base;
          writer.line(false);
          writer.setIndent(base + 1);
          state.pendingControl = null;
        } else writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'FOR' || rawUpper === 'WHILE') {
        if (rawUpper === 'FOR' && nextUpper === 'UPDATE') {
          // Handled as a SQL clause below.
        } else {
          if (writer.hasContent && canonical()) writer.line(false);
          const base = writer.indentLevel;
          writer.word(applyKeywordCase(token.raw, options));
          writer.space();
          state.pendingControl = { type: 'LOOP', base };
          state.lastKeyword = rawUpper;
          state.lastToken = token;
          continue;
        }
      }

      if (rawUpper === 'LOOP' && previousUpper !== 'END') {
        writer.space();
        writer.word(applyKeywordCase(token.raw, options));
        const base = state.pendingControl && state.pendingControl.type === 'LOOP' ? state.pendingControl.base : writer.indentLevel;
        pushBlock('LOOP', base);
        writer.line(false);
        writer.setIndent(base + 1);
        state.pendingControl = null;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'CASE' && previousUpper !== 'END') {
        const base = writer.indentLevel;
        writer.word(applyKeywordCase(token.raw, options));
        pushBlock('CASE', base);
        if (canonical()) {
          writer.line(false);
          writer.setIndent(base + 1);
        } else writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'WHEN' && !clause) {
        const caseBlock = [...state.blockStack].reverse().find((item) => item.type === 'CASE');
        if (writer.hasContent) writer.line(false);
        if (caseBlock) writer.setIndent(caseBlock.base + 1);
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'SELECT') {
        let query = state.currentQuery;
        if (!query || query.depth !== state.parenDepth) {
          query = {
            baseIndent: writer.indentLevel,
            depth: state.parenDepth,
            clause: null,
            clauseDepth: state.parenDepth,
            contentIndent: writer.indentLevel + 1
          };
          state.currentQuery = query;
        }
        if (writer.hasContent && (canonical() || token.newlinesBefore > 0)) writer.line(false);
        writer.setIndent(query.baseIndent);
        writer.word(applyKeywordCase(token.raw, options));
        query.clause = 'SELECT';
        query.clauseDepth = state.parenDepth;
        query.contentIndent = query.baseIndent + 1;
        state.clause = 'SELECT';
        state.clauseDepth = state.parenDepth;
        if (canonical() && next && next.type === 'hint') {
          writer.space();
          state.pendingDmlHint = 'SELECT';
        } else if (canonical()) {
          writer.line(false);
          writer.setIndent(query.contentIndent);
        } else writer.space();
        state.statementStart = false;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'WITH' && previousUpper !== 'START') {
        const query = {
          baseIndent: writer.indentLevel,
          depth: state.parenDepth,
          clause: 'WITH',
          clauseDepth: state.parenDepth,
          contentIndent: writer.indentLevel + 1
        };
        state.currentQuery = query;
        if (writer.hasContent && (canonical() || token.newlinesBefore > 0)) writer.line(false);
        writer.setIndent(query.baseIndent);
        writer.word(applyKeywordCase(token.raw, options));
        if (canonical()) {
          writer.line(false);
          writer.setIndent(query.contentIndent);
        } else writer.space();
        state.clause = 'WITH';
        state.clauseDepth = state.parenDepth;
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (clause) {
        if (clause.kind === 'GROUP_BY') startClause('GROUP_BY', clause.count, i, 'newline-content');
        else if (clause.kind === 'ORDER_BY') startClause('ORDER_BY', clause.count, i, 'newline-content');
        else if (clause.kind === 'CONNECT_BY') startClause('CONNECT_BY', clause.count, i, 'same-line');
        else if (clause.kind === 'START_WITH') startClause('START_WITH', clause.count, i, 'same-line');
        else if (clause.kind === 'FOR_UPDATE') startClause('FOR_UPDATE', clause.count, i, 'same-line');
        else if (clause.kind === 'RETURNING_INTO') startClause('RETURNING_INTO', clause.count, i, 'newline-content');
        else if (clause.kind === 'SET_OPERATOR') {
          const query = ensureQuery();
          if (writer.hasContent) writer.line(false);
          writer.setIndent(query.baseIndent);
          writePhrase(writer, significant, i, clause.count, options);
          writer.line(false);
          writer.setIndent(query.baseIndent);
          query.clause = null;
          state.clause = null;
        } else if (clause.kind === 'JOIN') {
          const query = ensureQuery();
          if (writer.hasContent) writer.line(false);
          writer.setIndent(query.baseIndent);
          writePhrase(writer, significant, i, clause.count, options);
          writer.space();
          query.clause = 'JOIN';
          query.clauseDepth = state.parenDepth;
          query.contentIndent = query.baseIndent + 1;
          state.clause = 'JOIN';
        } else if (clause.kind === 'MERGE_WHEN') {
          const query = ensureQuery();
          if (writer.hasContent) writer.line(false);
          writer.setIndent(query.baseIndent);
          writePhrase(writer, significant, i, clause.count, options);
          writer.line(false);
          writer.setIndent(query.baseIndent + 1);
          state.clause = 'MERGE_WHEN';
          state.mergeAction = true;
          state.mergeActionKind = null;
        } else if (['PARTITION_BY', 'WITHIN_GROUP', 'BULK_COLLECT', 'BULK_COLLECT_INTO', 'FETCH'].includes(clause.kind)) {
          writer.space();
          writePhrase(writer, significant, i, clause.count, options);
          writer.space();
        }
        i += clause.count - 1;
        state.lastKeyword = upperToken(significant[i]);
        state.lastToken = significant[i];
        continue;
      }

      if (state.mergeAction && rawUpper === 'SET') {
        const query = ensureQuery();
        if (writer.hasContent) writer.line(false);
        writer.setIndent(query.baseIndent + 1);
        writer.word(applyKeywordCase(token.raw, options));
        if (canonical()) {
          writer.line(false);
          writer.setIndent(query.baseIndent + 2);
        } else writer.space();
        query.clause = 'MERGE_SET';
        query.clauseDepth = state.parenDepth;
        query.contentIndent = query.baseIndent + 2;
        state.clause = 'MERGE_SET';
        state.mergeActionKind = 'UPDATE';
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (state.mergeAction && rawUpper === 'VALUES') {
        const query = ensureQuery();
        if (writer.hasContent) writer.line(false);
        writer.setIndent(query.baseIndent + 1);
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        writer.setIndent(query.baseIndent + 2);
        query.clause = 'MERGE_VALUES';
        query.clauseDepth = state.parenDepth;
        query.contentIndent = query.baseIndent + 2;
        state.clause = 'MERGE_VALUES';
        state.mergeActionKind = 'INSERT';
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'INTO' && ['INSERT', 'MERGE'].includes(state.lastKeyword || previousUpper)) {
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'FROM' && (previousUpper === 'DELETE' || state.lastKeyword === 'DELETE')) {
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (['FROM', 'WHERE', 'HAVING', 'ON', 'USING', 'SET', 'VALUES', 'INTO', 'OFFSET', 'MODEL'].includes(rawUpper)) {
        const style = ['WHERE', 'HAVING'].includes(rawUpper) ? 'same-line' : rawUpper === 'SET' ? 'newline-content' : 'same-line';
        startClause(rawUpper, 1, i, style);
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'AND') {
        if (state.betweenDepths.has(state.parenDepth)) {
          state.betweenDepths.delete(state.parenDepth);
          writer.space();
          writer.word(applyKeywordCase(token.raw, options));
          writer.space();
        } else if (canonical() || writer.currentLength > options.lineWidth || token.newlinesBefore > 0) {
          breakForBoolean(applyKeywordCase(token.raw, options));
        } else {
          writer.space();
          writer.word(applyKeywordCase(token.raw, options));
          writer.space();
        }
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'OR' && previousUpper === 'CREATE' && nextUpper === 'REPLACE') {
        writer.word(applyKeywordCase(token.raw, options));
        writer.space();
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'OR') {
        if (canonical() || writer.currentLength > options.lineWidth || token.newlinesBefore > 0) breakForBoolean(applyKeywordCase(token.raw, options));
        else {
          writer.space();
          writer.word(applyKeywordCase(token.raw, options));
          writer.space();
        }
        state.lastKeyword = rawUpper;
        state.lastToken = token;
        continue;
      }

      if (rawUpper === 'BETWEEN') state.betweenDepths.add(state.parenDepth);

      if (state.mergeAction && ['UPDATE', 'INSERT'].includes(rawUpper)) state.mergeActionKind = rawUpper;

      if (rawUpper === 'MERGE') {
        ensureQuery();
        state.mergeAction = false;
        state.mergeActionKind = null;
      }

      if (['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'CREATE', 'ALTER', 'DROP'].includes(rawUpper) && writer.hasContent && state.statementStart) {
        writer.line(false);
      }

      writer.word(applyKeywordCase(token.raw, options));
      if (next && next.raw !== ')' && next.raw !== ',' && next.raw !== ';' && next.raw !== '.' && !(next.type === 'operator' && next.raw === '(+)')) writer.space();
      state.statementStart = false;
      state.lastKeyword = KEYWORDS.has(rawUpper) ? rawUpper : state.lastKeyword;
      state.lastToken = token;
    }

    let output = writer.toString();
    const leadingBlankLine = /^(?:\r\n|\r|\n)/.test(source);
    if (leadingBlankLine && output) output = '\n' + output;
    const hadTrailingNewline = /(?:\r\n|\r|\n)$/.test(source);
    if (hadTrailingNewline && output) output += '\n';
    return { output, diagnostics, tokenCount: tokens.length, formatted: output !== normalizeEol(source) };
  }

  function tokenFingerprint(source, options) {
    const tokens = tokenize(source);
    return tokens
      .filter((token) => !['whitespace', 'newline'].includes(token.type))
      .map((token) => {
        let value = normalizeEol(token.raw);
        // pika: 주석은 포맷 시 줄 끝 공백이 제거되므로 비교에서도 무시 (문자열은 제외 — 내부 공백은 의미 있음)
        if (['line_comment', 'block_comment', 'hint'].includes(token.type)) {
          value = value.replace(/[ \t]+$/gm, '');
        }
        if (token.type === 'word' && KEYWORDS.has(token.raw.toUpperCase()) && options.keywordCase !== 'preserve') {
          value = token.raw.toUpperCase();
        }
        return `${token.type}:${value}`;
      });
  }

  function verifyTokenPreservation(source, output, options) {
    const before = tokenFingerprint(source, options);
    const after = tokenFingerprint(output, options);
    if (before.length !== after.length) {
      return {
        ok: false,
        reason: `Token count changed from ${before.length} to ${after.length}.`,
        beforeCount: before.length,
        afterCount: after.length
      };
    }
    for (let i = 0; i < before.length; i += 1) {
      if (before[i] !== after[i]) {
        return {
          ok: false,
          reason: `Token ${i + 1} changed.`,
          index: i,
          before: before[i],
          after: after[i],
          beforeCount: before.length,
          afterCount: after.length
        };
      }
    }
    return { ok: true, beforeCount: before.length, afterCount: after.length };
  }

  function countStatements(source) {
    const tokens = tokenize(source);
    let semicolons = 0;
    for (const token of tokens) if (token.type === 'punctuation' && token.raw === ';') semicolons += 1;
    return semicolons;
  }

  function format(source, userOptions) {
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const options = mergeOptions(userOptions);
    const eol = options.endOfLine === 'crlf' ? '\r\n' : options.endOfLine === 'lf' ? '\n' : detectEol(source);
    const segmented = segmentScript(source);
    const diagnostics = [];
    let outputNormalized = '';
    let tokenCount = 0;
    let formattedSegments = 0;
    let preservedSegments = 0;

    for (const segment of segmented.segments) {
      if (segment.type === 'protected') {
        outputNormalized += normalizeEol(segment.text);
        preservedSegments += 1;
        continue;
      }
      const result = formatCodeSegment(segment.text, options);
      outputNormalized += result.output;
      tokenCount += result.tokenCount;
      diagnostics.push(...result.diagnostics);
      if (result.formatted) formattedSegments += 1;
      else preservedSegments += 1;
    }

    let verification = { ok: true, beforeCount: 0, afterCount: 0 };
    if (options.verifyTokens) {
      verification = verifyTokenPreservation(source, outputNormalized, options);
      if (!verification.ok) {
        diagnostics.push({
          severity: 'error',
          code: 'TOKEN_MISMATCH',
          message: `Safety verification failed: ${verification.reason} The original source was returned.`
        });
        outputNormalized = normalizeEol(source);
      }
    }

    const significantTokenCount = options.verifyTokens ? verification.beforeCount : tokenFingerprint(source, options).length;
    const output = eol === '\n' ? outputNormalized : outputNormalized.replace(/\n/g, eol);
    const finished = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    return {
      output,
      diagnostics,
      verification,
      stats: {
        version: VERSION,
        elapsedMs: Math.max(0, finished - started),
        inputCharacters: source.length,
        outputCharacters: output.length,
        tokenCount: significantTokenCount,
        statementTerminators: countStatements(source),
        protectedLines: segmented.protectedLineCount,
        sqlPlusCommands: segmented.sqlPlusCommandCount,
        formattedSegments,
        preservedSegments
      },
      options
    };
  }

  function check(source, options) {
    const result = format(source, options);
    return Object.assign({}, result, {
      changed: normalizeEol(source) !== normalizeEol(result.output)
    });
  }

  const api = {
    VERSION,
    DEFAULT_OPTIONS,
    KEYWORDS,
    tokenize,
    segmentScript,
    format,
    check,
    verifyTokenPreservation
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.OracleFormatter = api;
})(typeof window !== 'undefined' ? window : globalThis);

// pika: ESM default export added for Vite bundling (original also sets window.OracleFormatter)
export default globalThis.OracleFormatter;
