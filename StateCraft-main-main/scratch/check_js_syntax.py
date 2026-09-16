import re

def check_js_syntax(filename):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove single line comments
    content_no_comments = re.sub(r"//.*", "", content)
    # Remove multi-line comments
    content_no_comments = re.sub(r"/\*[\s\S]*?\*/", "", content_no_comments)

    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    in_quote = None
    escaped = False
    lines = content.split('\n')
    
    # Check overall brace/bracket/parenthesis balance
    line_num = 1
    col_num = 1
    
    i = 0
    while i < len(content):
        ch = content[i]
        if ch == '\n':
            line_num += 1
            col_num = 1
            i += 1
            continue

        if in_quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == in_quote:
                in_quote = None
                quote_start_line = None
        else:
            if ch in ("'", '"', '`'):
                in_quote = ch
                quote_start_line = line_num
                quote_start_col = col_num
            elif ch == '/' and i + 1 < len(content):
                if content[i+1] == '/':
                    # skip single line comment
                    next_nl = content.find('\n', i)
                    if next_nl == -1:
                        break
                    i = next_nl
                    line_num += 1
                    col_num = 1
                    continue
                elif content[i+1] == '*':
                    # skip multi line comment
                    end_comm = content.find('*/', i + 2)
                    if end_comm == -1:
                        print(f"Error: unclosed comment in {filename}")
                        return False
                    # count newlines inside comment
                    line_num += content[i:end_comm+2].count('\n')
                    i = end_comm + 2
                    continue
            elif ch in ('(', '[', '{'):
                stack.append((ch, line_num, col_num))
            elif ch in (')', ']', '}'):
                if not stack:
                    print(f"Error in {filename}: unexpected closing '{ch}' at line {line_num}:{col_num}")
                    return False
                top, t_line, t_col = stack.pop()
                if top != pairs[ch]:
                    print(f"Error in {filename}: mismatched '{ch}' at line {line_num}:{col_num} (opened with '{top}' at line {t_line}:{t_col})")
                    return False

        col_num += 1
        i += 1

    if in_quote:
        print(f"Error in {filename}: unclosed quote {in_quote} opened at line {quote_start_line}:{quote_start_col}")
        return False
        
    if stack:
        top, t_line, t_col = stack[-1]
        print(f"Error in {filename}: unclosed '{top}' from line {t_line}:{t_col}")
        return False

    print(f"[OK] {filename} balanced and validated!")
    return True

if __name__ == "__main__":
    assert check_js_syntax("js/common.js")
    assert check_js_syntax("js/admin.js")
    assert check_js_syntax("js/participant.js")
    print("\nALL JS FILES VALIDATED WITH PERFECT BRACE/BRACKET/QUOTE BALANCING!")
