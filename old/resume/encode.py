from html.parser import HTMLParser
import html

class HTMLContentEncoder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.encoded_content = ''
    
    def handle_starttag(self, tag, attrs):
        # Reconstruct the original start tag with attributes
        attrs_str = ''.join(f' {attr}="{html.escape(value, quote=True)}"' for attr, value in attrs)
        self.encoded_content += f'<{tag}{attrs_str}>'
    
    def handle_endtag(self, tag):
        # Add the original end tag to the content
        self.encoded_content += f'</{tag}>'
    
    def handle_data(self, data):
        # Trim the data to avoid issues with leading or trailing whitespace
        trimmed_data = data.strip()
        if trimmed_data:
            # Encode each character in the trimmed data to its corresponding HTML numeric entity
            self.encoded_content += ''.join(f'&#x{ord(char):x};' for char in trimmed_data)
        # If the original data had leading or trailing whitespace, preserve it
        if data.startswith(' ') and trimmed_data:
            self.encoded_content = self.encoded_content.lstrip()
            self.encoded_content = ' ' + self.encoded_content
        if data.endswith(' ') and trimmed_data:
            self.encoded_content = self.encoded_content.rstrip()
            self.encoded_content += ' '
    
    def handle_entityref(self, name):
        self.encoded_content += f'&{name};'
    
    def handle_charref(self, name):
        self.encoded_content += f'&#{name};'
    
    def handle_comment(self, data):
        # Keep comments intact but comment out this line if you want to encode them as well
        self.encoded_content += f'<!--{data}-->'

def encode_html_content(input_file_path, output_file_path):
    parser = HTMLContentEncoder()
    with open(input_file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    parser.feed(content)
    
    with open(output_file_path, 'w', encoding='utf-8') as file:
        file.write(parser.encoded_content)

# Specify the path to your input and output files
input_path = 'index.html'
output_path = 'encoded2.html'

encode_html_content(input_path, output_path)
