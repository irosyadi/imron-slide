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
# text = "I love machine learning because I love artificial intelligence and I love data and I hate cats"
# text = "wali kota surabaya, Eri Cahyadi menanggapi terkait oknum pengemudi Bus Suroboyo yang dinilai berkendara dengan ugal-ugalan. Dia bakal melakukan evaluasi setelah adanya laporan yang masuk. Diketahui, keluhan tersebut ramai di media sosial setelah Bus Trans Semanggi Suroboyo terlibat kecelakaan dengan sebuah mobil, di kawasan Jalan Mayjen Sungkono, Minggu lalu."
text = "Pada tanggal 17 Agustus 2025, 80 tahun sudah para pendiri bangsa Indonesia mendeklarasikan kemerdekaan Indonesia. Proklamasi tanggal 17 Agustus 1945 adalah momen penting dalam perjuangan panjang bangsa ini untuk berdiri di atas kaki kita sendiri. Setelah deklarasi Kemerdekaan 17 Agustus 1945 bangsa kita berperang selama 5 tahun, kita berperang merebut kemerdekaan dengan senjata dan dengan diplomasi, dengan semua kekuatan kita hingga kedaulatan kita benar-benar dapat kita rebut dan diakui pada tahun 1949. Sejak itu para pendahulu saya Presiden Republik Indonesia pertama hingga presiden Republik Indonesia yang ke-7 bekerja keras membangun bangsa Indonesia, bekerja keras untuk mewujudkan bangsa yang adil dan makmur. Presiden Soekarno memimpin perjuangan pembentukan Negara Kesatuan Republik Indonesia, dan berhasil mempertahankan keutuhan wilayah Republik Indonesia. Presiden Sukarno juga berhasil integrasikan Irian Barat ke dalam NKRI. Presiden Soeharto melaksanakan pembangunan ekonomi yang merata dari Sabang sampai Merauke, berhasil mewujudkan swasembada pangan dan meletakkan dasar-dasar industrialisasi ekonomi dan menurunkan kemiskinan ekstrem. Presiden Habibie mengenakan kita ke arah teknologi tinggi, mampu menjaga stabilitas ekonomi di tengah krisis multidimensi tahun 1998. Presiden Abdurrahman Wahid menjaga stabilitas bangsa, berhasil memperkokoh kerukunan antara suku agama dan ras sehingga jati diri bangsa Indonesia sebagai bangsa majemuk dalam keharmonisan terbentuk secara kuat dan kokoh. Presiden Megawati menyelesaikan proses pemulihan ekonomi akibat krisis ekonomi dan moneter yang berkepanjangan, menyelesaikan ribuan kasus perusahaan-perusahaan yang kolaps akibat krisis moneter 1998, dan melaksanakan pembinaan umum secara langsung untuk pertama kalinya serta memperkuat lembaga-lembaga negara. Presiden Susilo Bambang Yudhoyono mengatasi kerawanan ekonomi karena krisis keuangan Dunia 2008, berhasil menyelesaikan konflik Aceh dan menyelesaikan dasar yang kuat untuk pembangunan ekonomi yang adil, merata dan terencana. Presiden Joko Widodo membangun berbagai infrastruktur penting, meningkatkan konektivitas antara sentra-sentra ekonomi, memimpin kita di saat yang kritis yaitu pandemic covid-19 sehingga Indonesia salah satu negara yang paling cepat pulih dari dampak pandemik, keluar dari kesulitan ekonomi, dan juga beliau merintis pembangunan ibukota negara Nusantara dan meletakkan dasar strategi hilirisasi sumber daya alam Indonesia. Seluruh presiden pendahulu saya bersama pemerintah yang mereka Pimpin berupaya mewujudkan Indonesia yang lebih dekat dengan cita-cita kemerdekaan kita yaitu negara yang merdeka berdaulat adil dan makmur. Negara yang sesuai dengan cita-cita pembentukan negara kita yang tercantum dalam pembukaan undang-undang dasar 1945 yaitu negara yang melindungi segenap bangsa Indonesia dan seluruh tumpah darah Indonesia, memajukan kesejahteraan umum, mencerdaskan kehidupan bangsa, dan melaksanakan ketertiban dunia yang berdasarkan kemerdekaan perdamaian abadi dan keadilan sosial. Saudara-saudara sekalian yang saya hormati, Tujuan kita merdeka adalah untuk merdeka dari kemiskinan, untuk merdeka dari kelaparan, merdeka dari penderitaan, negara kita harus bisa berdiri di atas kaki kita sendiri, negara kita harus berdaulat secara ekonomi dan mampu memenuhi kebutuhan pangan kita sendiri. Negara kita diberi karunia oleh Allah subhanahu wa ta'ala sumber daya yang melimpah ruah. Tantangan kita adalah menjaga dan mengelola kekayaan kita agar cita-cita kemerdekaan kita dapat terwujud dalam waktu sesingkat-singkatnya. Hadirin sekalian, Hari ini 299 hari yang lalu saya berdiri di sini, dan diambil sumpah oleh MPR. di hadapan wakil-wakil rakyat Indonesia, di hadapan rakyat Indonesia dan terutama dihadapan Tuhan yang maha kuasa bersama wakil presiden saya saudara Gibran rakabuming Raka Dan di hari yang hikmat ini saya kembali berdiri di depan saudara-saudara, di depan wakil-wakil rakyat untuk menyampaikan laporan kerja pemerintahan yang saya Pimpin dan lembaga-lembaga negara. Pertama, saya ingin menyampaikan bahwa transisi kepemimpinan nasional dari Presiden Joko Widodo ke pemerintahan yang saya Pimpin berjalan dalam semangat persatuan penuh Kehormatan dan kedewasaan politik. Peralihan kepemimpinan yang diakui dunia sebagai peralihan yang lancar dan sangat baik adalah bukti demokrasi kita matang dan kuat. Tidak semua negara mampu melaksanakan transisi kepemimpinan dengan baik dan lancar seperti kita. Di mana-mana ketika saya berada di luar negeri banyak pemimpin negara sahabat bertanya kepada saya how did you do it? How did Indonesia manage it? Saya sampaikan ke mereka kita berhasil karena kita menganut demokrasi yang khas Indonesia, demokrasi yang sejuk, demokrasi yang mempersatukan, bukan demokrasi yang saling gontok-gontokan, saling menjatuhkan, saling makin memaki saling menghujat, bukan demokrasi yang saling membenci, inilah yang harus kita pegang teguh. Demokrasi asal nenek moyang kita adalah demokrasi yang sesuai dengan budaya kita, budaya kekeluargaan budaya gotong royong budaya mikul duwur, mendemjero, budaya saling mengisi, budaya saling mendukung, budaya tepo seliro, budaya menahan diri, budaya yang iso rumongso bukan rumongso iso. Kita paham dan mengerti bahwa dalam suatu negara modern perlu ada pengawasan, perlu ada transparansi dalam menjalankan kekuasaan, kita paham sejarah umat manusia jika ada kekuasaan yang tidak diawasi maka kekuasaan akan menjadi korup. Kekuasaan yang absolut akan menjadi korupsi secara absolut. Kita paham bahwa Korupsi adalah masalah besar di bangsa kita. Kita paham perilaku korupsi ada di setiap eselon birokrasi kita, ada di setiap institusi dan organisasi pemerintahan. Perilaku korup ada di BUMN BUMN, ada di BUMD BUMD kita. Ini bukan fakta yang kita tutup-tutupi. Setelah 299 hari saya memimpin pemerintahan eksekutif saya semakin mengetahui berapa besar tantangan kita, berapa besar penyelewengan yang ada di lingkungan pemerintahan kita. Hal ini tidak baik tapi harus saya laporkan kepada para wakil-wakil rakyat Indonesia. Dalam pidato pelantikan Saya di sini saya sampaikan bangsa Indonesia harus berani melihat kekurangan-kekurangan sendiri, harus berani melihat kesalahan-kesalahan kita sendiri, harus berani melihat penyakit-penyakit yang ada di tubuh kita agar kita bisa perbaiki kekurangan-kekurangan tersebut. Tanpa mau mengakui tidak mungkin kita mampu memperbaiki. Saya disumpah untuk melaksanakan perintah undang-undang dasar Republik kita. Karena itu saya tidak ada pilihan lain selain memimpin upaya pemberantasan korupsi dan penyelewengan di semua lembaga eksekutif dan pemerintahan. Itulah sebabnya pada awal tahun 2025 ini kami telah identifikasi dan telah selamatkan Rp 300 triliun uang dari APBN yang kami lihat rawan diselewengkan. Diantaranya anggaran perjalanan dinas luar dan dalam negeri yang begitu besar, anggaran alat tulis kantor yang begitu besar dan berbagai anggaran yang selama ini jadi sumber korupsi dan sumber bancaan. Efisiensi ini diperintah oleh undang-undang dasar kita yaitu ayat 4 pasal 33 undang-undang dasar Negara Republik Indonesia. Rp 300 triliun kami geser untuk hal-hal yang lebih produktif dan langsung bisa dirasakan rakyat banyak. Majelis yang terhormat, sebagai Presiden Republik Indonesia saya bertanggung jawab atas pemerintahan eksekutif saya berkewajiban menegakkan hukum demi keselamatan bangsa. Saat ini kita menghadapi realita terjadi kebocoran kekayaan negara kita dalam skala yang sangat besar. Kita mengalami suatu kondisi yang saya sebut net outflow of national wealth. Janganlah kita menghabiskan tenaga kita untuk mencari siapa yang salah, kita tidak ada waktu, kita tidak punya cukup energi untuk mencari kesalahan orang. Pemerintah yang saya Pimpin harus mengusahakan diri untuk mencari solusi yang tepat dan cepat atas masalah pokok ini. Ibarat sebuah badan kalau darahnya terus mengalir keluar maka pada suatu titik badan itu akan mati. Kalau mengalirnya kekayaan kita ke luar negeri kita biarkan terus-menerus kita berpotensi jadi negara gagal. karena itu saya berkewajiban untuk mengambil langkah-langkah yang perlu walaupun itu sulit dan juga tidak populer bagi pihak-pihak tertentu. Saya harus mengambil langkah-langkah untuk menyelamatkan kekayaan negara agar bisa digunakan untuk kepentingan bangsa kita di hari ini dan di hari esok, untuk kepentingan generasi sekarang dan generasi mendatang."
bigram_model = build_bigram_model(text)

print("Bigram Model:", dict(bigram_model))
print_transition_matrix(bigram_model)

# Generate sentence starting from 'I'
generated = generate_text(bigram_model, "Indonesia", length=12)
print("Generated Text:", generated)
