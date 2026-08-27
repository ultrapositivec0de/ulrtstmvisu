import sys
with open('src/App.tsx', 'r') as f:
    text = f.read()

start = text.find('export default function App() {')
end = text.find('const { processContentForSteem')

print(text[start:end+100])
