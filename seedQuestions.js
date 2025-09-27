// seedQuestions.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "./models/Question.js";

dotenv.config();

const questions = [
  {
    text: "¿Cuál es el río más largo del mundo?",
    options: ["Amazonas", "Nilo", "Yangtsé", "Misisipi"],
    correctIndex: 0,
    category: "geography",
  },
  {
    text: "¿Quién escribió 'Cien años de soledad'?",
    options: ["Gabriel García Márquez", "Mario Vargas Llosa", "Pablo Neruda", "Julio Cortázar"],
    correctIndex: 0,
    category: "literature",
  },
  {
    text: "¿En qué año llegó el hombre a la Luna?",
    options: ["1965", "1969", "1972", "1975"],
    correctIndex: 1,
    category: "history",
  },
  {
    text: "¿Cuál es el elemento químico con símbolo O?",
    options: ["Oro", "Oxígeno", "Osmio", "Ozono"],
    correctIndex: 1,
    category: "science",
  },
  {
    text: "¿Quién pintó la Mona Lisa?",
    options: ["Miguel Ángel", "Leonardo da Vinci", "Rafael", "Botticelli"],
    correctIndex: 1,
    category: "art",
  },
  {
    text: "¿Cuál es la religión con más seguidores en el mundo?",
    options: ["Islam", "Cristianismo", "Hinduismo", "Budismo"],
    correctIndex: 1,
    category: "religion",
  },
  {
    text: "¿Quién dirigió la película 'Titanic'?",
    options: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Ridley Scott"],
    correctIndex: 1,
    category: "cinema",
  },
  {
    text: "¿Cuál es la capital de Francia?",
    options: ["Roma", "Madrid", "París", "Berlín"],
    correctIndex: 2,
    category: "geography",
  },
  {
    text: "¿Cuál es la fórmula química del agua?",
    options: ["H2O", "CO2", "O2", "NaCl"],
    correctIndex: 0,
    category: "science",
  },
  {
    text: "¿Quién inventó la bombilla?",
    options: ["Nikola Tesla", "Thomas Edison", "Albert Einstein", "Benjamin Franklin"],
    correctIndex: 1,
    category: "technology",
  },
  // 🔥 Nuevas 10 preguntas
  {
    text: "¿Cuál es el planeta más grande del sistema solar?",
    options: ["Saturno", "Júpiter", "Neptuno", "Urano"],
    correctIndex: 1,
    category: "science",
  },
  {
    text: "¿En qué continente está Egipto?",
    options: ["Asia", "África", "Europa", "América"],
    correctIndex: 1,
    category: "geography",
  },
  {
    text: "¿Quién escribió 'Don Quijote de la Mancha'?",
    options: ["Miguel de Cervantes", "Lope de Vega", "Francisco de Quevedo", "Góngora"],
    correctIndex: 0,
    category: "literature",
  },
  {
    text: "¿En qué año comenzó la Segunda Guerra Mundial?",
    options: ["1914", "1939", "1945", "1929"],
    correctIndex: 1,
    category: "history",
  },
  {
    text: "¿Cuál es el idioma más hablado en el mundo?",
    options: ["Inglés", "Chino mandarín", "Español", "Hindi"],
    correctIndex: 1,
    category: "culture",
  },
  {
    text: "¿Quién pintó 'La última cena'?",
    options: ["Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh", "Salvador Dalí"],
    correctIndex: 0,
    category: "art",
  },
  {
    text: "¿Cuál es la capital de Japón?",
    options: ["Pekín", "Seúl", "Tokio", "Osaka"],
    correctIndex: 2,
    category: "geography",
  },
  {
    text: "¿Cuál es el metal más ligero?",
    options: ["Aluminio", "Hierro", "Litio", "Magnesio"],
    correctIndex: 2,
    category: "science",
  },
  {
    text: "¿Quién es conocido como el padre de la computadora?",
    options: ["Alan Turing", "Charles Babbage", "Bill Gates", "Steve Jobs"],
    correctIndex: 1,
    category: "technology",
  },
  {
    text: "¿Qué país ganó el Mundial de Fútbol en 2018?",
    options: ["Brasil", "Alemania", "Francia", "Argentina"],
    correctIndex: 2,
    category: "sports",
  },
];

async function seedQuestions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    await Question.deleteMany({});
    console.log("🗑️ Preguntas anteriores eliminadas");

    await Question.insertMany(questions);
    console.log("🎉 20 preguntas insertadas correctamente");

    process.exit();
  } catch (err) {
    console.error("❌ Error insertando preguntas:", err);
    process.exit(1);
  }
}

seedQuestions();
