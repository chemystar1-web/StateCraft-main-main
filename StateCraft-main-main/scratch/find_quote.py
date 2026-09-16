with open('js/admin.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's tokenize character by character and track exact line number
line_num = 1
in_quote = None
quote_line = 0
quote_snippet = ""

for i, ch in enumerate(text):
    if ch == '\n':
        line_num += 1
        # In JavaScript, single (') and double (\") quotes CANNOT span across newlines!
        if in_quote in ("'", '"'):
            print(f"FATAL JS SYNTAX ERROR: Newline inside {in_quote}-quoted string on line {quote_line}!")
            print(f"Snippet: {repr(quote_snippet)}")
            break
    if in_quote:
        if ch == '\\':
            pass # simplified
        elif ch == in_quote:
            in_quote = None
        else:
            quote_snippet += ch
    else:
        if ch in ("'", '"', '`'):
            in_quote = ch
            quote_line = line_num
            quote_snippet = ""
