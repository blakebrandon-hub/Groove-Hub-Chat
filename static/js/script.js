var socket = io();
let player;
let detector;
let currentTime = 0;
let video_queue = {};
let seconds = 0;
let check_url = "";
let url_pass = true;
let chat_sounds = false;
let chat_messages = [];
let currentVideoIndex = 0;
let seek = true;
const API_KEY = 'AIzaSyC80EUqt8ErvmmJ-Q-5Srq2L72Ur0D3Mmg';
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const username = urlParams.get('username')


window.onload = function() {
    socket.send(`${username} joined the room`);
}

 function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                height: '315',
                width: '560',
                videoId: '',
                playerVars: {
                    'autoplay': 1,
                    'controls': 0,    // Hide player controls
                    'disablekb': 1,   // Disable keyboard controls
                    'modestbranding': 1, // Minimize YouTube branding
                    'rel': 0,         // Disable related videos at the end
                    'mute': 1,
                    'enablejsapi': 1   
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }

// Hidden iframe for detecting blocked videos before they can be added
async function loadAndCheckVideo(videoId) {
    return new Promise((resolve, reject) => {
        if (detector) {
            detector.destroy(); // Destroy the previous detector instance
        }

        detector = new YT.Player('detector', {
            height: '315',
            width: '560',
            videoId: '', // Load later when ready
            playerVars: {
                'autoplay': 1,
                'controls': 0,    // Hide player controls
                'disablekb': 1,   // Disable keyboard controls
                'modestbranding': 1, // Minimize YouTube branding
                'rel': 0,         // Disable related videos at the end
                'mute': 1,
                'enablejsapi': 1   
            },
            events: {
                'onReady': function(event) {
                    setTimeout(function() {
                        detector.loadVideoById(videoId);
                    }, 1000);

                    // Once the video loads, check it after a short delay
                    setTimeout(() => {
                        detector.stopVideo();
                        url_pass = true;
                        resolve(); // Video passed the check
                    }, 2000); // Adjust this delay based on when you want to validate
                },
                'onError': function(event) {
                    if (event.data == 101 || event.data == 150) {
                        alert('Video is blocked. Try adding a different YouTube URL.');
                        url_pass = false;
                        reject(); // Video failed the check
                    }
                }
            }
        });
    });
}

    
function onPlayerReady(event) {
    playFirstVideo();
}

function playFirstVideo() {
    console.log(`currentTime at playFirstVideo: ${currentTime}`)
    player.loadVideoById(video_queue[0].video_id, currentTime)
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PAUSED) {
        player.playVideo()
    }

    if (event.data === YT.PlayerState.PLAYING) {

        if (seek === true) {
            player.seekTo(currentTime);
            player.playVideo();
        }
        seek = false;
        
        updateDuration();
        setInterval(updateCurrentTime, 1000);  // Update server every second
        updateNowPlaying();
    }

if (event.data === YT.PlayerState.ENDED) {
    // Delete the current video from the queue
    delete video_queue[currentVideoIndex];

    currentVideoIndex += 1;

    // Get the remaining keys in the queue
    const remainingKeys = Object.keys(video_queue);

    // If there are still videos left in the queue
    if (remainingKeys.length > 0) {
        player.loadVideoById(video_queue[currentVideoIndex].video_id);
        player.playVideo();
    } else {
        console.log('No more songs left in the queue');
        currentVideoIndex = 0;  // Reset the index if no videos are left
    }

    // Update the queue and notify the server
    updateVideoQueue(video_queue);
    socket.emit('video_ended');
    }

}

function updateCurrentTime() {
  currentTime = player.getCurrentTime();
  document.getElementById('currentTime').textContent = formatTime(currentTime);
  socket.emit('update_time', currentTime);
}

function updateDuration() { 
  var duration = player.getDuration(); // If this is synchronous
  document.getElementById('duration').textContent = formatTime(duration);
}

function formatTime(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = Math.floor(seconds % 60);
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

async function addVideo() {
    const input = document.getElementById('itemInput');
    let newItemText = input.value.trim();

    if (!newItemText) {
        console.error('Input is empty');
        alert('Please enter a YouTube URL.');
        return;
    }

    let videoId = null;

    // Check if it's a standard YouTube link
    const youtubePrefix = "https://www.youtube.com/watch?v=";
    const youtuBePrefix = "https://youtu.be/";

    if (newItemText.includes(youtubePrefix)) {
        videoId = newItemText.split(youtubePrefix)[1].split('&')[0]; // Extract video ID and ignore parameters
    } 
    // Check if it's a youtu.be link
    else if (newItemText.includes(youtuBePrefix)) {
        videoId = newItemText.split(youtuBePrefix)[1].split('?')[0]; // Extract video ID and ignore parameters
    } else {
        console.error('Invalid YouTube URL');
        alert('Please enter a valid YouTube URL.');
        return;
    }

    check_url = videoId;

    try {
        await loadAndCheckVideo(videoId);  // Wait for the video check to complete

        if (url_pass && videoId) {
            fetchTitle(videoId).then(title => {
                if (!title) {
                    console.error('Error adding video to the queue');
                    alert('Failed to fetch video details.');
                    return;
                }

                // Emit the new video data to the server via Socket.IO
                socket.emit('add_video', {
                    "title": title,
                    "video_id": videoId
                });

                // Clear input field after adding the video
                input.value = '';

                // Notify the chat about the new addition
                socket.send(`${username} added ${title}`);

            });

            url_pass = true;
        }
    } catch (error) {
        console.error('Error loading or checking video:', error);
    }
}

// Function to fetch video title
async function fetchTitle(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${API_KEY}&part=snippet`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const title = data.items[0].snippet.title; // Extract the video title
      return title; // Return just the title
    } else {
      throw new Error('Video not found');
    }
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

// Tabbed Panels - DO NOT CHANGE
function openTab(tabId) {
    // Hide all panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => panel.classList.remove('active'));

    // Remove active class from all tab buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));

    // Show the clicked tab's panel and set the button to active
    document.getElementById(tabId).classList.add('active');
    const activeButton = Array.from(buttons).find(button => button.getAttribute('data-tab') === tabId);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Initialize with the 'chat' tab open
document.addEventListener('DOMContentLoaded', () => openTab('chat'));

// Add event listeners to tab buttons
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => openTab(button.getAttribute('data-tab')));
});

// Mute Video Checkbox
document.getElementById('muteToggle').addEventListener('change', function() {
  if (this.checked) {
    player.mute();            // Mute the video when checked
  } else {
    player.unMute();          // Unmute the video when unchecked
  }
});

// Mute Chat Checkbox
document.getElementById('muteChatToggle').addEventListener('change', function() {
    if (this.checked === true) {  // Use === for comparison
        chat_sounds = false;
    } else {
        chat_sounds = true;
    }
});

function updateChatMessages(msgs) {
    let messages = document.getElementById('messages');
    messages.innerHTML = ""; // Clear the existing messages
    msgs.forEach(message => {
        let li = document.createElement("li");
        li.innerText = message; // Directly reference the message
        messages.appendChild(li); // Add the message to the messages list
    });
}

function updateVideoQueue(queue) {
    let queueList = document.getElementById('queueList');
    queueList.innerHTML = ""; // Clear the existing list

    let videoKeys = Object.keys(video_queue);

    videoKeys.forEach(key => {
        let video = video_queue[key]; // Get video object by key
        let li = document.createElement("li");
        li.innerText = video.title; // Assuming video has a 'title' property
        queueList.appendChild(li); // Add the video title to the list
    });
}

function updateNowPlaying() {
    var videoData = player.getVideoData(); 
    var videoTitle = videoData.title;
    var element = document.getElementById("title");
    element.innerText = videoTitle; // Fixed variable name
}

function sendMessage() {
    var input = document.getElementById('myMessage');
    var message = input.value;
    
    // Check if the message is not just empty spaces
    if (message.trim() !== "") {
        var s = `${username}: ${message}`;
        
        // Send the message through the socket
        socket.send(s);
        
        // Clear the input field
        input.value = '';

        // Play sound only if it's a regular chat message
        if (!message.includes("likes")) {
            playSound();  // Play sound only when sending a regular chat message
        }
    }  
}  

function upvote() {
    var videoData = player.getVideoData();
    var videoTitle = videoData.title;
    socket.send(`${username} likes "${videoTitle}"`);
}

function downvote() {
    var videoData = player.getVideoData();
    var videoTitle = videoData.title;
    socket.send(`${username} dislikes "${videoTitle}"`);
}

// Play chat sound
function playSound() {
    if (chat_sounds === true) {
        var audio = document.getElementById('chat-sound');
        audio.play();
    }
}

socket.on('sync', (data) => {
    current_video = data.current_video;
    currentTime = data.currentTime;
    player.loadVideoById(current_video, currentTime);
    player.playVideo();
});

socket.on('message', function(msg) {
    var messagesDiv = document.getElementById('messages');
    var newMessage = document.createElement('p');
    newMessage.innerText = msg;
    messagesDiv.appendChild(newMessage);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;  // Auto-scroll to the bottom
    playSound();
});

socket.on('video_added', function(queue) {
    video_queue = queue;
    updateVideoQueue(queue);

    // Play if first video
    if (player.getPlayerState() != YT.PlayerState.PLAYING) {
        player.loadVideoById(video_queue[0].video_id);
        player.playVideo();
    }

});

socket.on('sync_video', (data) => {
    video_queue = data.video_queue;
    chat_messages = data.chat_messages;
    currentTime = data.time;
    console.log(`Current Time at sync_video ${currentTime}`);
    updateChatMessages(chat_messages);
    updateVideoQueue(video_queue);
});

socket.on('sync', (data) => {
    currentVideo = data.current_video;
    current_time = data.currentTime;
    player.loadVideoById(current_video, currentTime);
    player.playVideo();
});

// Press enter to send message
document.getElementById('myMessage').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        sendMessage(); // Calls the sendMessage function
    }
});

// Detect when the user exits and re-enters the app (visibility change)
document.addEventListener('visibilitychange', function() {
    if (player && document.visibilityState === 'visible') {
        player.seekTo(currentTime);

    }    
});

function manualSync() {
    // Check if player exists and destroy it to reset
    if (player && typeof player.destroy === 'function') {
        player.destroy();
    }

    // Recreate the player with the same video ID
    player2 = new YT.Player('player2', {
        height: '315',
        width: '560',
        videoId: currentVideoId,  // Use the current video ID here
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'modestbranding': 1,
            'rel': 0,
            'mute': 1,
            'enablejsapi': 1
        },
        events: {
            'onReady': onPlayerReady2,
            'onStateChange': onPlayerStateChange2
        }
    });

    function onPlayerReady2(event) {
    playFirstVideo2();
}

function playFirstVideo2() {
    console.log(`currentTime at playFirstVideo: ${currentTime}`)
    player.loadVideoById(video_queue[0].video_id, currentTime)
}

function onPlayerStateChange2(event) {
    if (event.data === YT.PlayerState.PAUSED) {
        player.playVideo()
    }

    if (event.data === YT.PlayerState.PLAYING) {

        if (seek === true) {
            player.seekTo(currentTime);
            player.playVideo();
        }
        seek = false;
        
        updateDuration();
        setInterval(updateCurrentTime, 1000);  // Update server every second
        updateNowPlaying();
    }

if (event.data === YT.PlayerState.ENDED) {
    // Delete the current video from the queue
    delete video_queue[currentVideoIndex];

    currentVideoIndex += 1;

    // Get the remaining keys in the queue
    const remainingKeys = Object.keys(video_queue);

    // If there are still videos left in the queue
    if (remainingKeys.length > 0) {
        player.loadVideoById(video_queue[currentVideoIndex].video_id);
        player.playVideo();
    } else {
        console.log('No more songs left in the queue');
        currentVideoIndex = 0;  // Reset the index if no videos are left
    }

}
}
