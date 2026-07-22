// Comprehensive Spanish Dictionary Lexicon for T9 Predictive Engine
export const CHAR_TO_T9_DIGIT: Record<string, string> = {
  'a': '2', 'b': '2', 'c': '2', 'á': '2', 'à': '2', 'ä': '2',
  'd': '3', 'e': '3', 'f': '3', 'é': '3', 'è': '3', 'ë': '3',
  'g': '4', 'h': '4', 'i': '4', 'í': '4', 'ì': '4', 'ï': '4',
  'j': '5', 'k': '5', 'l': '5',
  'm': '6', 'n': '6', 'o': '6', 'ñ': '6', 'ó': '6', 'ò': '6', 'ö': '6',
  'p': '7', 'q': '7', 'r': '7', 's': '7',
  't': '8', 'u': '8', 'v': '8', 'ú': '8', 'ù': '8', 'ü': '8',
  'w': '9', 'x': '9', 'y': '9', 'z': '9'
};

export const wordToT9Sequence = (word: string): string => {
  return word.toLowerCase().split('').map(ch => CHAR_TO_T9_DIGIT[ch] || '').join('');
};

export interface DictionaryWord {
  word: string;
  seq: string;
  freq: number;
}

// Massive Curated Spanish Dictionary (Nouns, Verbs, Adjectives, Adverbs, Prepositions)
export const SPANISH_DICTIONARY_RAW: { word: string; freq: number }[] = [
  // High-Frequency Core Verbs & Variations (Tengo, Tienes, Tiene, Puedo, Quiero, etc.)
  { word: "tengo", freq: 1350 },
  { word: "tienes", freq: 1280 },
  { word: "tiene", freq: 1300 },
  { word: "tenemos", freq: 1250 },
  { word: "tienen", freq: 1240 },
  { word: "vengo", freq: 1220 },
  { word: "vienes", freq: 1190 },
  { word: "viene", freq: 1200 },
  { word: "puedo", freq: 1340 },
  { word: "puedes", freq: 1300 },
  { word: "puede", freq: 1310 },
  { word: "podemos", freq: 1250 },
  { word: "quiero", freq: 1350 },
  { word: "quieres", freq: 1300 },
  { word: "quiere", freq: 1310 },
  { word: "siento", freq: 1250 },
  { word: "sientes", freq: 1200 },
  { word: "siente", freq: 1210 },
  { word: "pongo", freq: 1180 },
  { word: "pone", freq: 1170 },
  { word: "salgo", freq: 1150 },
  { word: "sale", freq: 1140 },
  { word: "traigo", freq: 1160 },
  { word: "trae", freq: 1150 },

  // High-Frequency Words containing 'Ñ' (Caño, Baño, Año, Niños, Sueño, etc.)
  { word: "caño", freq: 1150 },
  { word: "caños", freq: 1100 },
  { word: "baño", freq: 1250 },
  { word: "baños", freq: 1180 },
  { word: "año", freq: 1240 },
  { word: "años", freq: 1230 },
  { word: "niño", freq: 1200 },
  { word: "niña", freq: 1200 },
  { word: "niños", freq: 1180 },
  { word: "niñas", freq: 1180 },
  { word: "señor", freq: 1170 },
  { word: "señora", freq: 1170 },
  { word: "señores", freq: 1140 },
  { word: "sueño", freq: 1190 },
  { word: "sueños", freq: 1150 },
  { word: "paño", freq: 1120 },
  { word: "pañuelo", freq: 1140 },
  { word: "leña", freq: 1100 },
  { word: "engaño", freq: 1080 },
  { word: "compañía", freq: 1120 },
  { word: "compañero", freq: 1110 },
  { word: "compañera", freq: 1110 },
  { word: "enseñar", freq: 1130 },
  { word: "enseña", freq: 1120 },
  { word: "mañana", freq: 1250 },
  { word: "mano", freq: 1180 },
  { word: "manos", freq: 1170 },
  { word: "manta", freq: 1150 },
  { word: "manzana", freq: 1100 },
  { word: "mandar", freq: 1120 },
  { word: "mando", freq: 1110 },
  { word: "manera", freq: 1140 },

  // High-Frequency Core Verbs & Variations (Necesito, Necesita, Necesidad, Oficina, etc.)
  { word: "necesito", freq: 1300 },
  { word: "necesita", freq: 1250 },
  { word: "necesitan", freq: 1200 },
  { word: "necesidad", freq: 1180 },
  { word: "necesario", freq: 1170 },
  { word: "necesaria", freq: 1170 },
  { word: "oficina", freq: 1120 },
  { word: "oficial", freq: 1110 },
  { word: "ofrecer", freq: 1100 },
  { word: "ofrece", freq: 1100 },
  { word: "mecanismo", freq: 1050 },
  { word: "mecánica", freq: 1040 },

  // Short Words, Grammatical Articles & Prepositions
  { word: "hasta", freq: 1190 },
  { word: "hacia", freq: 1150 },
  { word: "desde", freq: 1160 },
  { word: "durante", freq: 1140 },
  { word: "mediante", freq: 1100 },
  { word: "entre", freq: 1150 },
  { word: "sobre", freq: 1150 },
  { word: "tras", freq: 1110 },
  { word: "según", freq: 1120 },
  { word: "contra", freq: 1130 },
  { word: "bajo", freq: 1140 },
  { word: "el", freq: 1200 }, { word: "la", freq: 1200 }, { word: "lo", freq: 1190 },
  { word: "los", freq: 1180 }, { word: "las", freq: 1180 }, { word: "de", freq: 1200 },
  { word: "del", freq: 1170 }, { word: "con", freq: 1170 }, { word: "sin", freq: 1150 },
  { word: "en", freq: 1190 }, { word: "para", freq: 1180 }, { word: "por", freq: 1180 },
  { word: "un", freq: 1170 }, { word: "una", freq: 1170 }, { word: "unos", freq: 1100 },
  { word: "unas", freq: 1100 }, { word: "al", freq: 1160 }, { word: "a", freq: 1190 },
  { word: "y", freq: 1200 }, { word: "o", freq: 1150 }, { word: "que", freq: 1190 },
  { word: "qué", freq: 1150 }, { word: "me", freq: 1160 }, { word: "te", freq: 1160 },
  { word: "se", freq: 1160 }, { word: "nos", freq: 1140 }, { word: "le", freq: 1140 },
  { word: "les", freq: 1130 }, { word: "mi", freq: 1150 }, { word: "mis", freq: 1120 },
  { word: "su", freq: 1140 }, { word: "sus", freq: 1110 }, { word: "tu", freq: 1140 },
  { word: "tus", freq: 1110 }, { word: "es", freq: 1160 }, { word: "son", freq: 1130 },
  { word: "esta", freq: 1120 }, { word: "este", freq: 1120 }, { word: "esto", freq: 1120 },
  { word: "eso", freq: 1110 }, { word: "aquello", freq: 1050 },

  // Adjectives (Largo, Corto, Bueno, Malo, Alto, Bajo, etc.)
  { word: "largo", freq: 950 }, { word: "larga", freq: 950 }, { word: "largos", freq: 920 }, { word: "largas", freq: 920 },
  { word: "corto", freq: 940 }, { word: "corta", freq: 940 }, { word: "cortos", freq: 910 }, { word: "cortas", freq: 910 },
  { word: "lindo", freq: 930 }, { word: "linda", freq: 930 }, { word: "lindos", freq: 900 }, { word: "lindas", freq: 900 },
  { word: "bello", freq: 880 }, { word: "bella", freq: 880 }, { word: "bellos", freq: 850 }, { word: "bellas", freq: 850 },
  { word: "feo", freq: 870 }, { word: "fea", freq: 870 }, { word: "feos", freq: 840 }, { word: "feas", freq: 840 },
  { word: "bueno", freq: 980 }, { word: "buena", freq: 980 }, { word: "buenos", freq: 950 }, { word: "buenas", freq: 950 },
  { word: "malo", freq: 920 }, { word: "mala", freq: 920 }, { word: "malos", freq: 890 }, { word: "malas", freq: 890 },
  { word: "grande", freq: 970 }, { word: "grandes", freq: 940 }, { word: "pequeño", freq: 930 }, { word: "pequeña", freq: 930 },
  { word: "alto", freq: 910 }, { word: "alta", freq: 910 }, { word: "altos", freq: 880 }, { word: "altas", freq: 880 },
  { word: "rápido", freq: 890 }, { word: "rápida", freq: 890 }, { word: "lento", freq: 880 }, { word: "lenta", freq: 880 },
  { word: "limpio", freq: 870 }, { word: "limpia", freq: 870 }, { word: "sucio", freq: 860 }, { word: "sucia", freq: 860 },
  { word: "caliente", freq: 890 }, { word: "frío", freq: 900 }, { word: "fría", freq: 900 }, { word: "tibio", freq: 850 },
  { word: "listo", freq: 950 }, { word: "lista", freq: 950 }, { word: "listos", freq: 920 }, { word: "listas", freq: 920 },
  { word: "nuevo", freq: 940 }, { word: "nueva", freq: 940 }, { word: "viejos", freq: 900 }, { word: "vieja", freq: 900 },

  // Household & Daily Life Nouns
  { word: "lámpara", freq: 850 }, { word: "mesa", freq: 860 }, { word: "silla", freq: 870 }, { word: "cama", freq: 880 },
  { word: "almohada", freq: 800 }, { word: "cobija", freq: 780 }, { word: "sábana", freq: 770 },
  { word: "vaso", freq: 840 }, { word: "plato", freq: 830 }, { word: "cuchara", freq: 810 }, { word: "tenedor", freq: 800 },
  { word: "servilleta", freq: 750 }, { word: "toalla", freq: 760 }, { word: "jabón", freq: 750 }, { word: "champú", freq: 700 },
  { word: "peine", freq: 710 }, { word: "cepillo", freq: 720 }, { word: "anteojos", freq: 740 },
  { word: "lentes", freq: 740 }, { word: "teléfono", freq: 850 }, { word: "celular", freq: 860 }, { word: "cargador", freq: 800 },
  { word: "control", freq: 820 }, { word: "remoto", freq: 810 }, { word: "timbre", freq: 790 }, { word: "campana", freq: 750 },
  { word: "silla de ruedas", freq: 900 }, { word: "ruedas", freq: 780 }, { word: "puerta", freq: 840 }, { word: "ventana", freq: 850 },
  { word: "luz", freq: 890 }, { word: "foco", freq: 750 }, { word: "radio", freq: 760 }, { word: "música", freq: 870 },
  { word: "canción", freq: 810 }, { word: "película", freq: 800 }, { word: "serie", freq: 790 }, { word: "vídeo", freq: 780 },
  { word: "juego", freq: 770 }, { word: "libro", freq: 760 }, { word: "hoja", freq: 750 }, { word: "lápiz", freq: 740 },
  { word: "papel", freq: 750 }, { word: "reloj", freq: 760 }, { word: "ropa", freq: 850 }, { word: "camisa", freq: 800 },

  // Verbs
  { word: "llegar", freq: 920 }, { word: "llegó", freq: 920 }, { word: "lleva", freq: 910 }, { word: "llevó", freq: 900 },
  { word: "llamar", freq: 930 }, { word: "llama", freq: 920 }, { word: "llamó", freq: 910 },
  { word: "leer", freq: 870 }, { word: "lee", freq: 860 }, { word: "lograr", freq: 840 },
  { word: "llover", freq: 820 }, { word: "llueve", freq: 820 }, { word: "lavar", freq: 850 },
  { word: "lava", freq: 840 }, { word: "limpiar", freq: 880 }, { word: "limpia", freq: 870 }, { word: "levantar", freq: 890 },
  { word: "sentar", freq: 870 }, { word: "sienta", freq: 860 },
  { word: "acostar", freq: 880 }, { word: "acuesta", freq: 870 }, { word: "dormir", freq: 950 }, { word: "duerme", freq: 920 },
  { word: "comer", freq: 960 }, { word: "come", freq: 940 }, { word: "comió", freq: 930 },
  { word: "tomar", freq: 950 }, { word: "toma", freq: 930 }, { word: "tomó", freq: 920 }, { word: "beber", freq: 900 },
  { word: "hablar", freq: 960 }, { word: "habla", freq: 940 }, { word: "habló", freq: 930 }, { word: "decir", freq: 970 },
  { word: "hacer", freq: 980 }, { word: "hace", freq: 970 }, { word: "hizo", freq: 960 },

  // Medical & Physical Health
  { word: "dolor", freq: 950 }, { word: "cabeza", freq: 940 }, { word: "espalda", freq: 930 }, { word: "cuello", freq: 920 },
  { word: "estómago", freq: 910 }, { word: "panza", freq: 900 }, { word: "brazo", freq: 890 }, { word: "mano", freq: 890 },
  { word: "pierna", freq: 880 }, { word: "pie", freq: 870 }, { word: "garganta", freq: 850 }, { word: "pecho", freq: 840 },
  { word: "corazón", freq: 830 }, { word: "remedio", freq: 900 }, { word: "medicina", freq: 900 }, { word: "pastilla", freq: 880 },
  { word: "doctor", freq: 870 }, { word: "doctora", freq: 870 }, { word: "enfermera", freq: 860 },

  // Essentials & AAC Core
  { word: "hola", freq: 1000 }, { word: "sí", freq: 990 }, { word: "no", freq: 990 }, { word: "gracias", freq: 980 },
  { word: "favor", freq: 970 }, { word: "cómo", freq: 950 }, { word: "estás", freq: 940 }, { word: "bien", freq: 930 },
  { word: "mal", freq: 920 }, { word: "quién", freq: 900 }, { word: "cuándo", freq: 890 }, { word: "dónde", freq: 880 },
  { word: "porqué", freq: 870 }, { word: "ayuda", freq: 860 }, { word: "frío", freq: 720 }, { word: "calor", freq: 710 },
  { word: "hambre", freq: 700 }, { word: "sed", freq: 690 }, { word: "sueño", freq: 680 }, { word: "cansado", freq: 670 },
  { word: "cansada", freq: 660 }, { word: "abrazos", freq: 520 }, { word: "beso", freq: 510 }, { word: "amor", freq: 500 },
  { word: "mamá", freq: 470 }, { word: "papá", freq: 460 }, { word: "hijo", freq: 450 }, { word: "hija", freq: 440 },
  { word: "familia", freq: 430 }, { word: "amigo", freq: 420 }, { word: "amiga", freq: 410 }, { word: "ahora", freq: 400 },
  { word: "después", freq: 390 }, { word: "hoy", freq: 380 }, { word: "tarde", freq: 360 }, { word: "noche", freq: 350 }, { word: "día", freq: 340 }
];

export const SPANISH_DICTIONARY: DictionaryWord[] = SPANISH_DICTIONARY_RAW.map(item => ({
  word: item.word,
  seq: wordToT9Sequence(item.word),
  freq: item.freq
}));

// Common Next-Word Predictor Map (Bigrams)
export const NEXT_WORD_MAP: Record<string, string[]> = {
  "hasta": ["luego", "mañana", "pronto", "la", "el"],
  "hola": ["cómo", "estás", "qué", "gracias"],
  "cómo": ["estás", "te", "va", "fue"],
  "estoy": ["bien", "mal", "cansado", "cansada", "escribiendo", "lista"],
  "necesito": ["agua", "ayuda", "ir", "remedio", "descansar", "moverme"],
  "tengo": ["hambre", "sed", "frío", "calor", "dolor", "sueño"],
  "quiero": ["la", "el", "ir", "agua", "dormir", "hablar"],
  "me": ["duele", "gusta", "siento", "parece"],
  "duele": ["la", "el", "cabeza", "espalda", "cuello", "estómago"],
  "de": ["la", "el", "mi", "eso", "nuevo"],
  "con": ["la", "el", "mi", "familia", "vos"],
  "la": ["lámpara", "luz", "mesa", "silla", "cama", "comida", "tele", "puerta"],
  "el": ["agua", "baño", "remedio", "doctor", "aire", "dolor", "teléfono"],
  "lo": ["mismo", "siento", "sé", "puedo"],
  "por": ["favor", "qué", "eso", "aquí"],
  "gracias": ["por", "muchas", "mamá", "papá"],
  "te": ["quiero", "amo", "agradezco"],
  "ir": ["hasta", "al", "a", "de", "con"],
  "al": ["baño", "médico", "cuarto"],
  "hace": ["frío", "calor", "mucho", "tiempo"],
  "prende": ["la", "el", "luz", "lámpara", "tele"],
  "apaga": ["la", "el", "luz", "lámpara", "tele"]
};
