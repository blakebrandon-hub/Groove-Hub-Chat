from flask import Flask, render_template, jsonify, request, session
from flask_socketio import SocketIO, emit, send
import uuid
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key'
socketio = SocketIO(app, async_mode='gevent')

video_queue = {}
current_time = 0
chat_messages = []

@app.route('/')
def landing_page():
    return render_template('landing_page.html')

@app.route('/groove-hub')
def index():
    return render_template('index.html')

@socketio.on('message')
def handle_message(msg):
    if len(chat_messages) >= 50:
        chat_messages.pop(0)  # Remove the oldest message (index 0)

    chat_messages.append(msg)  # Append the new message

    send(msg, broadcast=True)

@socketio.on('connect')
def handle_connect():
    global current_video, current_time

    # When a new user joins, send them the current video and time
    emit('sync_video', {'video_queue': video_queue, 'time': round(current_time), 'chat_messages': chat_messages});

@socketio.on('update_time')
def handle_update_time(data):
    global current_time
    current_time = round(data)

@socketio.on('add_video')
def handle_add_video(data):

    # Add the new entry to the queue
    video_queue[len(video_queue)] = {
        "title": data['title'],
        "video_id": data['video_id']
    }
    
    emit('update_queue', video_queue, broadcast=True)

@socketio.on('song_ended')
def handle_song_ended():
    global video_queue
    del video_queue[0]
    new_video_queue = {}
    index = 0
    if len(video_queue) >= 1:
        for key, value in video_queue.items():
            new_video_queue[index] = value
            index += 1
    video_queue = new_video_queue
    emit('update_queue', video_queue, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=True)
