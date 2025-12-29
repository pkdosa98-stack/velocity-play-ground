const templateEditor = ace.edit('template-editor');
const contextEditor = ace.edit('context-editor');

ace.require('ace/ext/language_tools');

const defaultContext = {
  user: { name: 'Ada Lovelace', role: 'Engineer' },
  numbers: [3, 7, 11],
  now: new Date().toISOString(),
};

const sampleTemplates = {
  welcome: `#set($userName = $user.name)
Hello $userName,

Welcome to the Velocity playground!
Your role is **$user.role**.

Current date: $helpers.date.format($now)
Numbers: $numbers

Need math?
Sum: $helpers.math.sum($numbers)
Average: $helpers.math.average($numbers)
Max: $helpers.math.max($numbers)

Cheers!
`,
  invoice: `#macro(renderItem $item)
 - $item.name: $item.currency $item.amount
#end

#set($subtotal = 0)
#foreach($item in $invoice.items)
  #set($subtotal = $subtotal + $item.amount)
#end

Invoice for $invoice.customer
Date: $helpers.date.format($invoice.date)

Items:
#foreach($item in $invoice.items)
  #renderItem($item)
#end

Subtotal: $invoice.currency $subtotal
Due: $invoice.currency $helpers.math.sum($subtotal, $invoice.tax)
`,
  helpers: `<!-- Demonstrate string escaping helpers -->
Unsafe HTML: <script>alert('xss')</script>
Escaped: $helpers.strings.escapeHtml(" <script>alert('xss')</script> ")
Unescaped: $helpers.strings.unescapeHtml("&amp;lt;em&amp;gt;Hello&amp;lt;/em&amp;gt;")

Date helpers:
- Now: $helpers.date.now()
- Add 3 days: $helpers.date.addDays($now, 3)
- Custom format: $helpers.date.format($now, "en-GB")

Math helpers:
- Sum: $helpers.math.sum(1, 2, 3, 4)
- Average: $helpers.math.average(5, 10, 15)
- Max: $helpers.math.max(2, 9, 4)
`,
};

const setupEditor = (editor, mode, placeholder) => {
  editor.setTheme('ace/theme/monokai');
  editor.session.setMode(`ace/mode/${mode}`);
  editor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
    fontSize: '14px',
    wrap: true,
    highlightActiveLine: true,
    showPrintMargin: false,
  });
  if (placeholder) editor.session.setValue(placeholder);
};

setupEditor(templateEditor, 'velocity', sampleTemplates.welcome);
setupEditor(contextEditor, 'json', JSON.stringify(defaultContext, null, 2));

const outputEl = document.getElementById('output');
const errorBanner = document.getElementById('error-banner');
const runButton = document.getElementById('run-button');

const showError = (message) => {
  errorBanner.textContent = message;
  errorBanner.hidden = !message;
};

const setRunning = (running) => {
  runButton.disabled = running;
  runButton.textContent = running ? 'Running...' : 'Run Template';
};

const beautifyVelocity = () => {
  const lines = templateEditor.getValue().split('\n');
  const indented = [];
  let indent = 0;
  const indentUnit = '  ';
  const openers = ['#if', '#foreach', '#macro', '#parse'];
  const closers = ['#end'];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const closes = closers.some((c) => trimmed.startsWith(c));
    if (closes) indent = Math.max(indent - 1, 0);
    indented.push(`${indentUnit.repeat(indent)}${trimmed}`);
    const opens = openers.some((o) => trimmed.startsWith(o));
    if (opens && !closes) indent += 1;
  });

  const beautified = pd ? pd.indent(indented.join('\n')) : indented.join('\n');
  templateEditor.setValue(beautified, 1);
};

const escapeHtml = () => {
  const escaped = templateEditor
    .getValue()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  templateEditor.setValue(escaped, 1);
};

const unescapeHtml = () => {
  const unescaped = templateEditor
    .getValue()
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
  templateEditor.setValue(unescaped, 1);
};

const formatContext = () => {
  try {
    const json = JSON.parse(contextEditor.getValue() || '{}');
    contextEditor.setValue(JSON.stringify(json, null, 2), 1);
    showError('');
  } catch (error) {
    showError(`Invalid JSON context: ${error.message}`);
  }
};

const runTemplate = async () => {
  showError('');
  outputEl.textContent = 'Rendering...';
  setRunning(true);
  let parsedContext = {};
  try {
    parsedContext = JSON.parse(contextEditor.getValue() || '{}');
  } catch (error) {
    showError(`Invalid JSON context: ${error.message}`);
    outputEl.textContent = '';
    setRunning(false);
    return;
  }

  try {
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: templateEditor.getValue(), context: parsedContext }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Render failed');
    outputEl.textContent = data.result;
  } catch (error) {
    showError(error.message);
    outputEl.textContent = '';
  } finally {
    setRunning(false);
  }
};

const loadHelpers = async () => {
  try {
    const res = await fetch('/api/helpers');
    const data = await res.json();
    const container = document.getElementById('helpers-list');
    container.innerHTML = '';
    Object.entries(data.helpers || {}).forEach(([category, methods]) => {
      const card = document.createElement('div');
      card.className = 'helper';
      card.innerHTML = `<strong>${category}</strong><div>${methods.join(', ')}</div>`;
      container.appendChild(card);
    });
    if (data.sampleData) {
      contextEditor.setValue(JSON.stringify({ ...defaultContext, ...data.sampleData }, null, 2), 1);
    }
  } catch (error) {
    showError(`Failed to load helpers: ${error.message}`);
  }
};

document.getElementById('run-button').addEventListener('click', runTemplate);
document.getElementById('beautify-button').addEventListener('click', beautifyVelocity);
document.getElementById('format-context-button').addEventListener('click', formatContext);
document.getElementById('escape-button').addEventListener('click', escapeHtml);
document.getElementById('unescape-button').addEventListener('click', unescapeHtml);
document.getElementById('reset-context').addEventListener('click', () => {
  contextEditor.setValue(JSON.stringify(defaultContext, null, 2), 1);
});
document.getElementById('copy-output').addEventListener('click', async () => {
  if (!outputEl.textContent) return;
  await navigator.clipboard.writeText(outputEl.textContent);
});
document.getElementById('sample-select').addEventListener('sl-change', (event) => {
  const key = event.detail.value;
  const template = sampleTemplates[key] || '';
  templateEditor.setValue(template, 1);
});
document.getElementById('clear-output').addEventListener('click', () => {
  outputEl.textContent = '';
});

document.addEventListener('keydown', (event) => {
  const isRunShortcut = (event.metaKey || event.ctrlKey) && event.key === 'Enter';
  if (isRunShortcut) {
    event.preventDefault();
    runTemplate();
  }
});

loadHelpers();
