# Groove Hub

Groove Hub is an interactive real-time music-sharing platform where users can create collaborative playlists, chat with friends, and enjoy synchronized YouTube video playback together. Groove Hub is designed to bring people together through the power of music.

## Features

### Core Features
- **Real-Time Video Queue**: Users can add YouTube videos to a shared queue, which updates in real-time for all participants.
- **Synchronized Playback**: Videos are synced across all connected clients, ensuring everyone experiences the music together.
- **Chat Integration**: A built-in chatroom allows users to discuss music, share thoughts, and connect with others.

### Additional Features
- **Mobile-Friendly Design**: Optimized for mobile and desktop devices to ensure a seamless experience.
- **Skip and Clear Queue Options**: Moderators can manage the playlist effectively.
- **Dynamic Now Playing Display**: Displays the current video title in real-time.
- **Customizable Video Settings**: Options for autoplay, mute, and resyncing videos.
- **User-Friendly Interface**: Intuitive design with separate tabs for the video queue and chat.

## Installation

Follow these steps to set up Groove Hub locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/blakebrandon-hub/groove-hub.git
   cd groove-hub
   ```

2. **Install Dependencies**:
   Make sure you have Python 3.9+ installed. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the project root with the following variables:
   ```env
   FLASK_APP=app.py
   FLASK_ENV=development
   SECRET_KEY=your_secret_key
   ```

4. **Run the Application**:
   ```bash
   flask run
   ```

5. **Access the Application**:
   Open your browser and navigate to `http://localhost:5000`.

## Deployment

Groove Hub is deployed on Heroku. To deploy your own instance:

1. **Prepare for Deployment**:
   - Ensure all static files are collected.
   - Add the necessary configuration files for Heroku, including `Procfile` and `requirements.txt`.

2. **Push to Heroku**:
   ```bash
   heroku login
   heroku create
   git push heroku main
   ```

3. **Set Environment Variables**:
   ```bash
   heroku config:set SECRET_KEY=your_secret_key
   ```

4. **Open the App**:
   ```bash
   heroku open
   ```

## Technologies Used

- **Backend**: Flask, Flask-SocketIO
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite (development), Heroku Postgres (production)
- **APIs**: YouTube IFrame API for video playback

## Contribution Guidelines

Contributions are welcome! If you want to report a bug or request a feature, please open an issue on the [GitHub repository](https://github.com/blakebrandon-hub/groove-hub).

To contribute code:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## Future Plans

- **Login System**: Adding user authentication with Flask-Login.
- **Chat History**: Persist chat messages for better user experience.
- **Enhanced Mobile Support**: Further improvements to the UI for mobile users.
- **Moderator Tools**: Additional features to manage queues and user activity.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## Contact

Created by Blake Brandon. For questions or feedback, feel free to reach out:
- GitHub: [https://github.com/blakebrandon-hub](https://github.com/blakebrandon-hub)
- Email: [blakebrandon.dev@gmail.com](mailto:blakebrandon.dev@gmail.com)

---

Enjoy sharing music with friends and creating lasting memories with Groove Hub!

