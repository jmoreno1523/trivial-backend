import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "La pregunta es obligatoria"],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length === 4; // 👉 exactamente 4 opciones
        },
        message: "Cada pregunta debe tener 4 opciones",
      },
      required: true,
    },
    correctIndex: {
      type: Number,
      required: true,
      min: [0, "El índice correcto no puede ser menor que 0"],
      max: [3, "El índice correcto no puede ser mayor que 3"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "general",
        "science",
        "literature",
        "history",
        "geography",
        "art",
        "religion",
        "cinema",
        "education",
        "technology",
        "culture",   // ✅ agregado
        "sports"    // ✅ agregado
      ],
      default: "general",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);

