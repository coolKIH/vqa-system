from flask import Flask, render_template, send_from_directory, request, flash, redirect, jsonify, abort
from werkzeug.utils import secure_filename
import os
import redis
import uuid
from datetime import datetime
import pickle

UPLOAD_FOLDER = 'uploads'

if not os.path.isdir(UPLOAD_FOLDER):
    os.mkdir(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = set(['png', 'jpg', 'jpeg', 'bmp'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

redis_obj = redis.Redis()


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('chat.html')


@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('static/js', path)


@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('static/css', path)


@app.route('/img/<path:path>')
def serve_image(path):
    return send_from_directory('static/img', path)


@app.route('/fonts/<path:path>')
def serve_fonts(path):
    return send_from_directory('static/fonts', path)


@app.route('/upload/', methods=['POST', 'GET'])
def upload_file():
    if request.method == 'POST':
        if 'myFile' in request.files:
            my_file = request.files['myFile']
            if my_file and my_file.filename and allowed_file(my_file.filename):
                filename = secure_filename(my_file.filename)
                base_name, suffix = os.path.splitext(filename)
                saved_as = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                while os.path.isfile(saved_as):
                    base_name = base_name + '(1)'
                    filename = base_name + suffix
                    saved_as = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                my_file.save(saved_as)
                redis_obj.rpush("uploaded", saved_as)
                return jsonify({'status': 1, 'filename': filename})
    return abort(404)


@app.route('/get_query/')
def get_query():
    if len(redis_obj.lrange("in", 0, -1)) > 100:
        response = dict()
        response['message'] = "Server is overloaded at the moment. Please try after some time."
        return jsonify(response)

    image_path = 'uploads/%s' % str(request.args['img'])
    q = str(request.args['q'])
    r_id = str(uuid.uuid4())
    response = {'status': 0}

    payload = "/__/".join([r_id, image_path, q])
    redis_obj.rpush("in", payload)
    redis_obj.rpush("query_log", "|...|".join([r_id, image_path, q, str(datetime.now()).split('.')[0]]))
    while True:
        predictions = redis_obj.hget("out", r_id)
        if predictions:
            predictions = pickle.loads(predictions)
            redis_obj.hdel("out", r_id)
            response['status'] = 1
            response['payload'] = predictions
            break
    return jsonify(response)


@app.route('/end_q_session/')
def end_q_session():
    image_path = 'uploads/%s' % str(request.args['img'])
    redis_obj.rpush('clear_img', image_path)
    return jsonify({})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000, threaded=True)
