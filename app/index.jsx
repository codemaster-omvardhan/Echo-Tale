import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Voice from "@react-native-voice/voice";
import * as Speech from "expo-speech";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI();

// --- Mock AI Function (Replace with your actual LLM API call) ---
const fetchStoryFromAI = async (storyHistory, currentChoices, userChoice) => {
  console.log(`Sending choice to AI: "${userChoice}"`);

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `You are the narrator of an interactive fantasy adventure game.
  The story so far is: "${storyHistory}".
  The user was presented with the choices: "${currentChoices.join(", ")}".
  They chose to: "${userChoice}".

  Continue the story with one engaging paragraph (around 40-60 words).
  End your response with two new, distinct choices for the user, formatted exactly as:
  CHOICE A: [First choice text]
  CHOICE B: [Second choice text]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // --- Parse the AI's response ---
    const lines = text.split("\n").filter((line) => line.length > 0);
    const story = lines.slice(0, lines.length - 2).join("\n");
    const choiceA = lines[lines.length - 2].replace("CHOICE A: ", "");
    const choiceB = lines[lines.length - 1].replace("CHOICE B: ", "");

    return {
      story: story,
      choices: [choiceA, choiceB],
    };
  } catch (error) {
    console.error("Error fetching story from AI:", error);
    // Return a fallback story in case of an error
    return {
      story:
        "An unexpected silence falls. It seems the winds of fate are confused. Let's try that again.",
      choices: currentChoices,
    };
  }
};

export default function App() {
  const [status, setStatus] = useState("idle"); // idle, listening, thinking, narrating
  const [story, setStory] = useState(
    "You stand at a crossroads. A dark cave looms to your left, and a sunny path stretches to your right."
  );
  const [choices, setChoices] = useState([
    "Enter the cave",
    "Take the sunny path",
  ]);
  const [transcribedText, setTranscribedText] = useState("");

  // --- Voice Recognition Setup ---
  useEffect(() => {
    const onSpeechResults = (e) => {
      setTranscribedText(e.value[0]);
    };
    const onSpeechEnd = () => {
      setStatus("thinking");
    };
    const onSpeechError = (e) => {
      console.error(e);
      setStatus("idle");
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // --- Game Logic ---
  useEffect(() => {
    if (status === "thinking" && transcribedText) {
      const processChoice = async () => {
        const result = await fetchStoryFromAI(transcribedText);
        setStory(result.story);
        setChoices(result.choices);
        setTranscribedText(""); // Clear the transcribed text for the next round
        playNarration(result.story); // Narrate the new story part
      };
      processChoice();
    }
  }, [status, transcribedText]);

  const startListening = async () => {
    try {
      await Voice.start("en-US");
      setStatus("listening");
    } catch (e) {
      console.error("Error starting voice recognition:", e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setStatus("idle");
    } catch (e) {
      console.error("Error stopping voice recognition:", e);
    }
  };

  // --- Narration Function (Replace with your Murf.ai WebSocket logic) ---
  const playNarration = (textToSpeak) => {
    setStatus("narrating");
    Speech.speak(textToSpeak, {
      onDone: () => {
        setStatus("idle"); // Ready for the next user input
      },
      onError: () => {
        console.error("Expo Speech Error");
        setStatus("idle");
      },
    });
  };

  const renderButton = () => {
    if (status === "listening") {
      return (
        <TouchableOpacity style={styles.button} onPress={stopListening}>
          <Text style={styles.buttonText}>Listening... (Tap to Stop)</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.button}
        onPress={startListening}
        disabled={status !== "idle"}
      >
        <Text style={styles.buttonText}>🎙️ Speak Your Choice</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.storyContainer}>
        <Text style={styles.storyText}>{story}</Text>
      </View>

      <View style={styles.choicesContainer}>
        <Text style={styles.choiceHeaderText}>Your Choices:</Text>
        {choices.map((choice, index) => (
          <Text key={index} style={styles.choiceText}>
            - {choice}
          </Text>
        ))}
      </View>

      <View style={styles.statusContainer}>
        {status === "thinking" && (
          <ActivityIndicator size="large" color="#fff" />
        )}
        <Text style={styles.statusText}>
          {status === "listening" && "Listening..."}
          {status === "thinking" && "The AI is thinking..."}
          {status === "narrating" && "The story continues..."}
          {status === "idle" && "What will you do?"}
        </Text>
        <Text style={styles.transcribedText}>{transcribedText}</Text>
      </View>

      <View style={styles.buttonContainer}>{renderButton()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    padding: 20,
    justifyContent: "space-between",
  },
  storyContainer: {
    flex: 3,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 15,
    justifyContent: "center",
  },
  storyText: {
    color: "#e0e0e0",
    fontSize: 20,
    fontStyle: "italic",
    lineHeight: 30,
  },
  choicesContainer: {
    flex: 2,
    marginTop: 20,
  },
  choiceHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  choiceText: {
    color: "#b3b3b3",
    fontSize: 16,
    marginBottom: 5,
  },
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#f0a500",
    fontSize: 16,
    marginTop: 10,
  },
  transcribedText: {
    color: "#fff",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 5,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#f0a500",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
  },
  buttonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
});
