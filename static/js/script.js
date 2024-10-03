var socket = io();
const API_KEY = 'AIzaSyC80EUqt8ErvmmJ-Q-5Srq2L72Ur0D3Mmg';
let player;
let currentVideoIndex = 0;
let currentTime = 0;
let username = "";
let video_queue = {};
let seconds = 0;

socket.on('sync_video', (data) => {

            video_queue = data.video_queue;
            currentTime = data.time;

            console.log(`Current Time: ${currentTime}`)

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
    username = prompt("Please enter your username:");

    // Correct check for an empty username, prompting until valid input
    while (!username) {
        username = prompt("Username cannot be empty. Please enter your username:");
    }

    // Notify the server that a user has joined the chatroom
    socket.send(`${username} joined the room`);

}

// Listen for real-time sync updates from the server

//setTimeout(function() {}, 5000);
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

// Update server with current video time
function updateCurrentTime() {
    currentTime = player.getCurrentTime();
    socket.emit('update_time', { time: player.getCurrentTime() });
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


function onPlayerReady(event) {

    player.loadVideoById(video_queue[currentVideoIndex].video_id, currentTime);
}

function onPlayerStateChange(event) {

    if (event.data === YT.PlayerState.PAUSED) {
        player.playVideo();  // Restart video if it is paused
    }

    if (event.data === YT.PlayerState.PLAYING) {
        //getCurrentTime();

        // Update the duration when available
        updateDuration();
          
        setInterval(updateCurrentTime, 1000);  // Update server every second

          updateNowPlaying();
            }
        
    if (event.data === YT.PlayerState.ENDED) {
            // Increment the index to load the next video, but stop if we're at the end
            if (currentVideoIndex < Object.keys(video_queue).length - 1) {
                currentVideoIndex++;
                player.loadVideoById(video_queue[currentVideoIndex].video_id);
                updateNowPlaying();
            } else {
                console.log("End of the queue");
            }
        }
            
}


function skipSong() {

    // Check if video_queue is empty
    if (video_queue.length === 0) {
        player.stopVideo();
        return; // Exit the function if there are no videos
    }

    socket.emit('song_ended', function() {
    update_queue(video_queue); // Call update_queue with the latest video_queue data
});

    // Increment index only if there's another video
    if (currentVideoIndex < Object.keys(video_queue).length - 1) {
        currentVideoIndex++;
        player.loadVideoById(video_queue[currentVideoIndex].video_id);
        updateNowPlaying();
    } else {
        console.log("No more videos to skip to.");
    }

    // Disable skip button for five seconds
    const skipButton = document.getElementById('skip-button');
    skipButton.disabled = true;

    setTimeout(function() {
        skipButton.disabled = false;
    }, 5000);
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

function addVideo() {
    const input = document.getElementById('itemInput');
    let newItemText = input.value.trim();

    if (!newItemText) {
        console.error('Input is empty');
        alert('Please enter a YouTube URL.');
        return;
    }

    const youtubePrefix = "https://www.youtube.com/watch?v=";
    
    if (newItemText.includes(youtubePrefix)) {
        const videoId = newItemText.split(youtubePrefix)[1];

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
            socket.send(`${username} has added ${title} to the queue`);

            socket.emit('update_queue');

        }).catch(error => {
            console.error('Error adding video to the queue:', error);
            alert('An error occurred while adding the video.');
        });
    } else {
        console.error('Invalid YouTube URL');
        alert('Please enter a valid YouTube URL.');
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

// Toggle mute/unmute with checkbox click
document.getElementById('muteToggle').addEventListener('change', function() {
  if (this.checked) {
    player.mute();            // Mute the video when checked
  } else {
    player.unMute();          // Unmute the video when unchecked
  }
});

        socket.on('message', function(msg) {
            var messagesDiv = document.getElementById('messages');
            var newMessage = document.createElement('p');
            newMessage.innerText = msg;
            messagesDiv.appendChild(newMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;  // Auto-scroll to the bottom
        });

        function sendMessage() {
            var input = document.getElementById('myMessage');
            var message = input.value;
            if (message.trim() !== "") {
                socket.send(`${username}: ${message}`);
                input.value = '';
            }
        }

        function upvote() {
            socket.send(`${username} likes "${video_queue[currentVideoIndex].title}"`);
        }

        function downvote() {
            socket.send(`${username} dislikes "${video_queue[currentVideoIndex].title}"`);
        }

        function updateNowPlaying() {
            video_title = video_queue[currentVideoIndex].title;
            element = document.getElementById('title');
            element.innerText = video_title;
        }

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


            // Check if it's the first video and load it
            if (videoKeys.length === 1) {
                player.loadVideoById(video_queue[0].video_id);
                updateNowPlaying();
            }

     });
