from flask import Flask, render_template, jsonify, request, session
from flask_socketio import SocketIO, emit, send
import uuid


app = Flask(__name__)
app.secret_key = 'your_secret_key'
socketio = SocketIO(app, async_mode='gevent')

# Initialize an empty queue
video_queue = {}
current_time = 0


@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('message')
def handle_message(msg):
    send(msg, broadcast=True)

@socketio.on('connect')
def handle_connect():
    global current_video, current_time
    # When a new user joins, send them the current video and time
    emit('sync_video', {'video_queue': video_queue, 'time': round(current_time)})

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

@socketio.on('song_error')
def handle_song_error():
    # Theory: song_ended does not go off, song error does
    global video_queue
    del video_queue[0]
    del video_queue[0]
    new_video_queue = {}
    index = 0    
    if len(video_queue) >= 1:
        for key, value in video_queue.items():
            new_video_queue[index] = value
            index += 1
    video_queue = new_video_queue
    emit('resolve_error', video_queue, broadcast=True)   

if __name__ == '__main__':
    print('127.0.0.1:5000')
    socketio.run(app, debug=True)
