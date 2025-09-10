import random
from collections import defaultdict
import pandas as pd

def build_bigram_model(text):
    words = text.split()
    bigram_model = defaultdict(list)
    
    for i in range(len(words) - 1):
        curr_word = words[i]
        next_word = words[i + 1]
        bigram_model[curr_word].append(next_word)
    
    return bigram_model

def generate_text(bigram_model, start_word, length=10):
    word = start_word
    result = [word]
    
    for _ in range(length - 1):
        next_words = bigram_model.get(word)
        if not next_words:
            break  # stop if no continuation
        word = random.choice(next_words)
        result.append(word)
    
    return " ".join(result)

def print_transition_matrix(bigram_model):
    words = sorted(list(bigram_model.keys()))
    matrix = []
    for word in words:
        row = []
        total_transitions = len(bigram_model[word])
        for next_word in words:
            count = bigram_model[word].count(next_word)
            row.append(count / total_transitions if total_transitions > 0 else 0)
        matrix.append(row)
    
    df = pd.DataFrame(matrix, index=words, columns=words)
    print("\nTransition Matrix:")
    print(df)


# Example usage
text = "I love machine learning because I love artificial intelligence and I love data and I hate cats"
# text = "wali kota surabaya, Eri Cahyadi menanggapi terkait oknum pengemudi Bus Suroboyo yang dinilai berkendara dengan ugal-ugalan. Dia bakal melakukan evaluasi setelah adanya laporan yang masuk. Diketahui, keluhan tersebut ramai di media sosial setelah Bus Trans Semanggi Suroboyo terlibat kecelakaan dengan sebuah mobil, di kawasan Jalan Mayjen Sungkono, Minggu lalu."
bigram_model = build_bigram_model(text)

print("Bigram Model:", dict(bigram_model))
print_transition_matrix(bigram_model)

# Generate sentence starting from 'I'
generated = generate_text(bigram_model, "learning", length=12)
print("Generated Text:", generated)
