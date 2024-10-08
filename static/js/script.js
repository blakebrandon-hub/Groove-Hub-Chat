var socket = io();
const API_KEY = 'AIzaSyC80EUqt8ErvmmJ-Q-5Srq2L72Ur0D3Mmg';
let player;
let detector;
let currentTime = 0;
let username = "";
let video_queue = {};
let seconds = 0;
let check_url = "";
let url_pass = true;
let chat_sounds = false;

socket.on('sync_video', (data) => {
            video_queue = data.video_queue;
            currentTime = data.time;

            let element = document.getElementById('queueList');
            element.innerHTML = ""; // Clear the existing list

            // Loop through each video in the queue
            let videoKeys = Object.keys(video_queue);
    
            videoKeys.forEach(key => {
            let video = video_queue[key]; // Get video object by key
            let li = document.createElement("li");
            li.innerText = video.title; // Assuming video has a 'title' property
            element.appendChild(li); // Add the video title to the list
    });
    
});

window.onload = function() {
   
    //Prompt user for username
    username = prompt("Please enter a username:");

    // Correct check for an empty username, prompting until valid input
    while (!username) {
        username = prompt("Username cannot be empty. Please enter a username:");
    }

    // Notify the server that a user has joined the chatroom
    socket.send(`${username} joined the room`);

}

// Create an <iframe> (and YouTube player) after the API code downloads
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
    setTimeout(function() {player.loadVideoById(video_queue[0].video_id, currentTime);}, 10000);
    
}

function onPlayerStateChange(event) {

    if (event.data === YT.PlayerState.PAUSED) {
        player.playVideo();  // Restart video if it is paused
    }

    if (event.data === YT.PlayerState.PLAYING) {

        updateDuration();
          
        setInterval(updateCurrentTime, 1000);  // Update server every second

          updateNowPlaying();
            }
        
    if (event.data === YT.PlayerState.ENDED) {

            socket.emit('song_ended');


        if (video_queue.length < 1) {
            console.log("End of the queue"); // Log if it's the end of the queue
        } 
            
    }
}

// Time Functions
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

                socket.emit('update_queue');
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

// Play chat sound
function playSound() {
    if (chat_sounds === true) {
        var audio = document.getElementById('chat-sound');
        audio.play();
    }
}


// Press enter to send message
document.getElementById('myMessage').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        sendMessage(); // Calls the sendMessage function
    }
});

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
    }  // Close the outer if block
}  // Close the sendMessage function


function upvote() {
    var videoData = player.getVideoData();
    var videoTitle = videoData.title;

    // No sound should be played during upvote, so just send the message
    socket.send(`${username} likes "${videoTitle}"`);
}

function downvote() {
    var videoData = player.getVideoData();
    var videoTitle = videoData.title;

    // No sound should be played during downvote, so just send the message
    socket.send(`${username} dislikes "${videoTitle}"`);
}



function updateNowPlaying() {
    var videoData = player.getVideoData(); 
    var videoTitle = videoData.title;
    var element = document.getElementById("title");
    element.innerText = videoTitle; // Fixed variable name
}

socket.on('message', function(msg) {
    var messagesDiv = document.getElementById('messages');
    var newMessage = document.createElement('p');
    newMessage.innerText = msg;
    messagesDiv.appendChild(newMessage);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;  // Auto-scroll to the bottom
    playSound();
});

socket.on('update_queue', function(queue) {
    video_queue = queue;
    let element = document.getElementById('queueList');
    element.innerHTML = ""; // Clear the existing list

    // Log the queue for debugging
    console.log(video_queue);

    // Loop through each video in the queue
    let videoKeys = Object.keys(video_queue);
    
    videoKeys.forEach(key => {
        let video = video_queue[key]; // Get video object by key
        let li = document.createElement("li");
        li.innerText = video.title; // Assuming video has a 'title' property
        element.appendChild(li); // Add the video title to the list
        element.scrollTop = element.scrollHeight;
    });


    // Check if the player is currently playing
    if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
        // Check if it's the first video in the queue and load it
        if (videoKeys.length >= 1) {
            player.loadVideoById(video_queue[0].video_id);
            updateNowPlaying(); // Update the "Now Playing" title
        }
    }
});
