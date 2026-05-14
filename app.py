import io
import time
import uuid
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from redactor import PDFRedactor

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

# In-memory store: file_id -> (bytes, timestamp, original_name)
_store: dict = {}
_FILE_TTL = 600  # 10 minutes


def _evict_expired():
    now = time.time()
    expired = [k for k, (_, ts, _) in _store.items() if now - ts > _FILE_TTL]
    for k in expired:
        del _store[k]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/redact', methods=['POST'])
def redact():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are supported'}), 400

    try:
        pdf_bytes = file.read()
        redacted_bytes, findings = PDFRedactor().redact(pdf_bytes)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        return jsonify({'error': f'Processing failed: {e}'}), 500

    _evict_expired()
    file_id = str(uuid.uuid4())
    original_name = secure_filename(file.filename)
    _store[file_id] = (redacted_bytes, time.time(), original_name)

    summary: dict[str, int] = {}
    for f in findings:
        summary[f['type']] = summary.get(f['type'], 0) + 1

    return jsonify({
        'file_id': file_id,
        'total': len(findings),
        'summary': summary,
        'original_name': original_name,
    })


@app.route('/download/<file_id>')
def download(file_id):
    entry = _store.pop(file_id, None)
    if entry is None:
        return 'File not found or already downloaded', 404

    data, _, original_name = entry
    return send_file(
        io.BytesIO(data),
        mimetype='application/pdf',
        as_attachment=True,
        download_name='redacted_' + original_name,
    )


if __name__ == '__main__':
    app.run(debug=True, port=5000)
