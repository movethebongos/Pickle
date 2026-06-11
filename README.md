# Pickle 🥒

**Find the perfect movie or show to watch with friends.**

Pickle is a real-time, collaborative web app that helps groups of friends decide what to watch. No more endless scrolling or debates—just create a room, invite your friends, and start swiping. When everyone swipes right on the same movie, you've found your match!

Try it out at:
https://pickle.gay

## How It Works

1.  **Create a Room**: Start a new session and get a unique room code.
2.  **Invite Friends**: Share the room URL (`pickle.app/ROOMCODE`) with friends. They can join instantly from any browser.
3.  **Set Preferences**: As the host, choose your group's streaming services (Netflix, Disney+, Prime Video, etc.) and preferred genres.
4.  **Swipe Together**: Everyone in the room is presented with the same movie cards. Swipe right for "Yes," left for "No."
5.  **Find Your Match!**: When everyone in the room swipes right on the same movie, it's a match! The app will let you know what you're watching tonight.

## Features

-   **Collaborative Swiping**: Real-time synchronization for a seamless group experience.
-   **Smart Filtering**: Filter movies by streaming provider and genre.
-   **Instant Room Joining**: No sign-up required. Join rooms instantly with a simple URL.
-   **Real-time Presence**: See how many people are currently in the room.
-   **Easy Sharing**: A built-in share button makes it simple to invite others.

## Tech Stack

-   **Frontend**: React, TypeScript, Vite
-   **Backend & Real-time**: Firebase (Firestore for database, Anonymous Auth for user sessions)
-   **Movie Data**: The Movie Database (TMDB) API
-   **Styling**: CSS Modules

## Local Development

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    You will need to set up both Firebase and TMDB.

    -   **Firebase**:
        1.  Create a new project at the [Firebase Console](https://console.firebase.google.com/).
        2.  Enable **Firestore Database** and **Anonymous Authentication**.
        3.  In your Project Settings, add a new Web App.
        4.  Copy the Firebase configuration keys.

    -   **TMDB**:
        1.  Create an account at [The Movie Database (TMDB)](https://www.themoviedb.org/).
        2.  Generate a new API Key in your account settings.

    -   Create a file named `.env.local` in the root of your project and add your keys:
        ```
        # Firebase Config
        VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxxx
        VITE_FIREBASE_AUTH_DOMAIN=xxxxxxxxxxxxxxxx
        VITE_FIREBASE_PROJECT_ID=xxxxxxxxxxxxxxxx
        VITE_FIREBASE_STORAGE_BUCKET=xxxxxxxxxxxxxxxx
        VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxxxxxxxx
        VITE_FIREBASE_APP_ID=xxxxxxxxxxxxxxxx

        # TMDB API Key
        VITE_TMDB_API_KEY=xxxxxxxxxxxxxxxx
        ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:5173`.
