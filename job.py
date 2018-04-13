from keras.models import model_from_json, Model
from keras.preprocessing.sequence import pad_sequences
from nltk.tokenize import word_tokenize
from time import sleep
import numpy as np
import h5py
import json
import redis
import pickle
from keras.applications.vgg19 import VGG19, preprocess_input
from keras.preprocessing.image import img_to_array, load_img

redis_obj = redis.Redis()

model_filename = 'resources/model.json'
model_weights_filename = 'resources/model_weights.h5'
json_file = open(model_filename, 'r')
loaded_model_json = json_file.read()
print "Reading Model..."
model = model_from_json(loaded_model_json)
print "Loading Weights..."
model.load_weights(model_weights_filename)
model.compile(optimizer='rmsprop', loss='categorical_crossentropy')

metadata = json.load(open('resources/data_prepro.json', 'r'))
metadata['ix_to_word'] = {str(word): int(i) for i, word in metadata['ix_to_word'].items()}


def get_ques_vector(question):
    question_vector = []
    seq_length = 26
    word_index = metadata['ix_to_word']
    for word in word_tokenize(question.lower()):
        if word in word_index:
            question_vector.append(word_index[word])
        else:
            question_vector.append(0)
    question_vector = np.array(pad_sequences([question_vector], maxlen=seq_length))[0]
    question_vector = question_vector.reshape((1, seq_length))
    return question_vector


def get_image_vector(filename):
    model = VGG19()
    model.layers.pop()
    model = Model(inputs=model.inputs, outputs=model.layers[-1].output)
    image = load_img(filename, target_size=(224, 224))
    image = img_to_array(image)
    image = image.reshape((1, image.shape[0], image.shape[1], image.shape[2]))
    image = preprocess_input(image)
    feature = model.predict(image, verbose=0)
    return feature


print "Job Started..."
while True:
    req = redis_obj.lpop("in")
    if req:
        r_id, image_path, question = req.split("/__/")
        img_vector = redis_obj.hget('image_vec', image_path)
        if img_vector:
            img_vector = pickle.loads(img_vector)
        else:
            img_vector = get_image_vector(image_path)
            img_vector = img_vector.reshape((1, 4096))
            redis_obj.hset('image_vec', image_path, pickle.dumps(img_vector))
        question_vector = get_ques_vector(question)
        pred = model.predict([img_vector, question_vector])[0]
        top_pred = pred.argsort()[-5:][::-1]
        preds = pickle.dumps([(metadata['ix_to_ans'][str(_)].title(), round(pred[_] * 100.0, 2)) for _ in top_pred])
        redis_obj.hset("out", r_id, preds)
    req = redis_obj.lpop("uploaded")
    if req and not redis_obj.hexists('image_vec', req):
        img_vector = get_image_vector(req)
        img_vector = img_vector.reshape((1, 4096))
        redis_obj.hset('image_vec', req, pickle.dumps(img_vector))
    req = redis_obj.lpop('clear_img')
    if req:
        redis_obj.hdel('image_vec', req)
    sleep(2)
