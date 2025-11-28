# caffind

### Overview

![Caffind Homepage](./demo/caffind-homepage-glass.png)

Caffind is a web application that allows users to search for coffee shops in their vicinity. It provides an intuitive interface to find coffee spots based on user location.

The application is built using React and OpenStreetMap API for location services.

### Configuration

Create a `.env` file in the project root with your OpenWeather API key:

```
VITE_OPENWEATHER_API_KEY=your_api_key_here

VITE_TRANSLATE_ENDPOINT=http://127.0.0.1:8000/translate # Change if needed
VITE_DEFAULT_TRANSLATE_LANG=vi                          # Change to your preferred language code
```

You can obtain a key by registering at [OpenWeather](https://openweathermap.org/api).

### Development

Command to run the project:

```
npm install
npm run dev
```
