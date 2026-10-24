const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SCHOOL_ID = 'sch-kandangan-tosari-01';
const ADMIN_USER_ID = 'usr-admin-01';

const RAW_STUDENTS = [
  // KELAS I (15)
  { no: 1, nipd: '967', classId: 'cls-01', nisn: '3198591866', name: 'AGISTA GABRILIA LAFISYA', birthPlace: 'Pasuruan', birthDate: '2019-08-25', gender: 'P', nik: '3514246508190001', agama: 'HINDU', ortu: 'BUASAN / LILIS DIYAH LESTARI' },
  { no: 2, nipd: '968', classId: 'cls-01', nisn: '3200069651', name: 'AKHMAD FAIREL ATHARIZ CALIEF', birthPlace: 'Pasuruan', birthDate: '2020-01-23', gender: 'L', nik: '3514242301200001', agama: 'ISLAM', ortu: 'AKHMAD SUPRIADI / NEVILIA YUNITASARI' },
  { no: 3, nipd: '969', classId: 'cls-01', nisn: '3191161982', name: 'APRILIA VIKANIA PUTRI', birthPlace: 'Pasuruan', birthDate: '2019-04-16', gender: 'P', nik: '3514245604190001', agama: 'HINDU', ortu: 'AGUS SULISTIYO / IIS NOFIYA' },
  { no: 4, nipd: '970', classId: 'cls-01', nisn: '3196263998', name: 'ASMIRADAH MEIDITA PRIANJANI', birthPlace: 'Pasuruan', birthDate: '2019-05-28', gender: 'P', nik: '3514246805190001', agama: 'HINDU', ortu: 'NGATONO / ANIK WIDIYANTI' },
  { no: 5, nipd: '971', classId: 'cls-01', nisn: '3190747051', name: 'DEYA LESTARI', birthPlace: 'Pasuruan', birthDate: '2019-05-02', gender: 'P', nik: '3514244205190001', agama: 'HINDU', ortu: 'SUNARDI / SUPRIHATIN' },
  { no: 6, nipd: '972', classId: 'cls-01', nisn: '3196190155', name: 'KAESAR RENATAN JULIO FERNANDO', birthPlace: 'Pasuruan', birthDate: '2019-07-20', gender: 'L', nik: '3514242007190001', agama: 'HINDU', ortu: 'SUHANDOKO / DIYA ITSETIYA DINA PURNAMA YANTI' },
  { no: 7, nipd: '973', classId: 'cls-01', nisn: null, name: 'NATALIA FIRA FIRNANDA', birthPlace: 'Pasuruan', birthDate: '2019-12-18', gender: 'P', nik: null, agama: 'HINDU', ortu: 'SATRIYO DIARJO / DEWI PURWITASARI' },
  { no: 8, nipd: '974', classId: 'cls-01', nisn: '3209377284', name: 'KYSA CAESAR SYAHKIRA', birthPlace: 'Pasuruan', birthDate: '2020-06-09', gender: 'P', nik: '3514244906200001', agama: 'HINDU', ortu: 'SAMSUL / KIFTIYAH ISNAWATI' },
  { no: 9, nipd: '975', classId: 'cls-01', nisn: '3195803452', name: 'MEYRISKA PRILLYNIA ANJANI', birthPlace: 'Pasuruan', birthDate: '2019-05-04', gender: 'P', nik: '3514244405190001', agama: 'ISLAM', ortu: 'DOLLA / KARNI' },
  { no: 10, nipd: '976', classId: 'cls-01', nisn: '3207432460', name: "NINING HABIBATUS SA'ADAH", birthPlace: 'Pasuruan', birthDate: '2020-06-06', gender: 'P', nik: '3514244606200001', agama: 'ISLAM', ortu: 'RUBIANTO / WAHYUNI' },
  { no: 11, nipd: '977', classId: 'cls-01', nisn: '3196063411', name: 'RAHEL DWI AGUSTIN', birthPlace: 'Pasuruan', birthDate: '2019-08-07', gender: 'P', nik: '3514244708190001', agama: 'HINDU', ortu: 'NGATINI' },
  { no: 12, nipd: '978', classId: 'cls-01', nisn: '3193443835', name: 'SADAM MOHAMMAD IRFAN', birthPlace: 'Pasuruan', birthDate: '2019-10-31', gender: 'L', nik: '3514243110190001', agama: 'ISLAM', ortu: 'HERMONO / YULIANA SRI LESTARI' },
  { no: 13, nipd: '979', classId: 'cls-01', nisn: '3198159284', name: 'SANZHA INDIRA', birthPlace: 'Pasuruan', birthDate: '2019-09-29', gender: 'P', nik: '3514026909190001', agama: 'ISLAM', ortu: 'DARMAWAN / SUMIARI' },
  { no: 14, nipd: '980', classId: 'cls-01', nisn: '3199626286', name: 'STEVANY ANGELIA', birthPlace: 'Pasuruan', birthDate: '2019-10-28', gender: 'P', nik: '3514246810190001', agama: 'HINDU', ortu: 'RUDIANTORO / TARSIH' },
  { no: 15, nipd: '981', classId: 'cls-01', nisn: '3198032121', name: 'SYAHNAZ SYAQILA NADIRA', birthPlace: 'Pasuruan', birthDate: '2019-09-17', gender: 'P', nik: '3514025709190003', agama: 'HINDU', ortu: 'ANDI SETIAWAN / NADIA ARIFIANTI' },

  // KELAS II (15)
  { no: 1, nipd: '951', classId: 'cls-02', nisn: '3186275296', name: 'AFIFA ARORA SALSABILLA', birthPlace: 'Pasuruan', birthDate: '2018-12-30', gender: 'P', nik: '3514247012180001', agama: 'ISLAM', ortu: 'LESTARI ARIFNO / SRI MUKTI' },
  { no: 2, nipd: '952', classId: 'cls-02', nisn: '3184066029', name: 'ALVINO ADI JAYA', birthPlace: 'Pasuruan', birthDate: '2018-03-26', gender: 'L', nik: '3514246031800001', agama: 'HINDU', ortu: 'MISNOTO / INDAH SRI WAHYUNI' },
  { no: 3, nipd: '953', classId: 'cls-02', nisn: '3187344941', name: 'BUNGA MAULIYA AYUDINATA', birthPlace: 'Pasuruan', birthDate: '2018-11-15', gender: 'P', nik: '3514241511180001', agama: 'ISLAM', ortu: 'PONIRI / NANIK' },
  { no: 4, nipd: '954', classId: 'cls-02', nisn: '3188050684', name: 'CAHYA FELIA ADINDA KIRANA', birthPlace: 'Pasuruan', birthDate: '2018-04-13', gender: 'P', nik: '3514245304180001', agama: 'HINDU', ortu: 'RUDI HARTONO / SULIANI' },
  { no: 5, nipd: '955', classId: 'cls-02', nisn: '3182492622', name: 'EZEKIEL GABRIEL RODRIKO ZICO', birthPlace: 'Pasuruan', birthDate: '2018-12-18', gender: 'L', nik: '3514241812180001', agama: 'HINDU', ortu: 'ALFAN ZAINUL ALIM / DIANA MAYANG SARI' },
  { no: 6, nipd: '956', classId: 'cls-02', nisn: '3181176471', name: 'FELICYA BILQIS VINDI OLIVIA', birthPlace: 'Pasuruan', birthDate: '2018-08-07', gender: 'P', nik: '3514244708180002', agama: 'HINDU', ortu: 'EDI ANTONO / RIKA SAFITRI' },
  { no: 7, nipd: '957', classId: 'cls-02', nisn: '3188409182', name: 'FIREN FINEZA FILANIKA', birthPlace: 'Pasuruan', birthDate: '2018-07-18', gender: 'P', nik: '3514245807180001', agama: 'HINDU', ortu: 'KARIYONO / SRI ASTUTI' },
  { no: 8, nipd: '958', classId: 'cls-02', nisn: '3184938675', name: 'HAFIZUL LUTHFI ALWI AL KHAFI', birthPlace: 'Pasuruan', birthDate: '2018-04-11', gender: 'L', nik: '3514241104180001', agama: 'ISLAM', ortu: 'NUH HARIADI / YAYUK WIDIA RUKMANA' },
  { no: 9, nipd: '959', classId: 'cls-02', nisn: '3189508032', name: 'MILKA OKTAVIA ANGGRAENI', birthPlace: 'Pasuruan', birthDate: '2018-10-28', gender: 'P', nik: '3514246810180001', agama: 'HINDU', ortu: 'RENDI SETIYA DARMA / YUWIS WAHYU WITA ASTUTI' },
  { no: 10, nipd: '960', classId: 'cls-02', nisn: '3185348331', name: 'OKTAVIANA DWI BAYU LESTARI', birthPlace: 'Pasuruan', birthDate: '2018-10-30', gender: 'P', nik: '3514247010180001', agama: 'HINDU', ortu: 'SUDIANTO / ALIS WAHYUNI' },
  { no: 11, nipd: '961', classId: 'cls-02', nisn: '3181419179', name: 'RIFKI ALVINO DIONATA', birthPlace: 'Pasuruan', birthDate: '2018-05-08', gender: 'L', nik: '3514240805180001', agama: 'ISLAM', ortu: 'EDI PORNOMO / SINTA AYU WULANSARI' },
  { no: 12, nipd: '962', classId: 'cls-02', nisn: '3189389197', name: 'SHENDI REJA RAMADANI', birthPlace: 'Pasuruan', birthDate: '2018-06-11', gender: 'L', nik: '3514245106180001', agama: 'ISLAM', ortu: 'SURIADI / DARSI' },
  { no: 13, nipd: '963', classId: 'cls-02', nisn: '3185249055', name: 'VINESSA AYU ANDIRA', birthPlace: 'Pasuruan', birthDate: '2018-01-24', gender: 'P', nik: '3514246401180001', agama: 'HINDU', ortu: 'SUTIRNO / LINDA PRATAMA SARI' },
  { no: 14, nipd: '964', classId: 'cls-02', nisn: '3186691995', name: 'VIRGO MAHENDRA YUDISTIRA', birthPlace: 'Pasuruan', birthDate: '2018-04-19', gender: 'L', nik: null, agama: 'HINDU', ortu: 'HENDRA HERMAWAN / NGATIA WANDA SARI' },
  { no: 15, nipd: '965', classId: 'cls-02', nisn: '3182419460', name: "WILI'AM DIRGA AL FARIZI", birthPlace: 'Pasuruan', birthDate: '2018-03-24', gender: 'L', nik: '3514242403180001', agama: 'ISLAM', ortu: 'SATIMAN / HERMAWATI' },

  // KELAS III (16)
  { no: 1, nipd: '936', classId: 'cls-03', nisn: '3179120811', name: 'AISYAH GHEFANIA AULIA AGUSTINA', birthPlace: 'Pasuruan', birthDate: '2017-08-17', gender: 'P', nik: '3514245708170002', agama: 'ISLAM', ortu: 'MARIANA' },
  { no: 2, nipd: '937', classId: 'cls-03', nisn: '3170302750', name: 'ALDO MAULANA SADEWA', birthPlace: 'Pasuruan', birthDate: '2017-09-13', gender: 'L', nik: '3514241309170001', agama: 'HINDU', ortu: 'SARIYAM' },
  { no: 3, nipd: '938', classId: 'cls-03', nisn: '3176468161', name: 'BAGAS WANADA ADITYA DEWATA', birthPlace: 'Pasuruan', birthDate: '2017-10-13', gender: 'L', nik: '3514241311170001', agama: 'HINDU', ortu: 'WANTO / LINDA SUTRIANI' },
  { no: 4, nipd: '939', classId: 'cls-03', nisn: '3176359111', name: 'CAKRA SETIA DARMANENG PUJA', birthPlace: 'Malang', birthDate: '2017-06-13', gender: 'L', nik: '3514241306170001', agama: 'HINDU', ortu: 'ADI WINOTO / MURNI DIAN LESTARI' },
  { no: 5, nipd: '940', classId: 'cls-03', nisn: '3170253559', name: 'DAVISTA ANANTASYA', birthPlace: 'Pasuruan', birthDate: '2017-04-24', gender: 'P', nik: '3514246404170002', agama: 'HINDU', ortu: 'YUNUS / DEWI TIRTA NINGRUM' },
  { no: 6, nipd: '941', classId: 'cls-03', nisn: '3165623862', name: 'DISKI PUTRA MAULANA', birthPlace: 'Pasuruan', birthDate: '2016-11-27', gender: 'L', nik: '3514242711160001', agama: 'ISLAM', ortu: 'ANDI / INDRA NURWITA SARI' },
  { no: 7, nipd: '942', classId: 'cls-03', nisn: '3175741650', name: 'EGISYA RENANTA SEVILONA', birthPlace: 'Pasuruan', birthDate: '2017-10-05', gender: 'P', nik: '3514244510170001', agama: 'HINDU', ortu: 'MOHAMAT SYAHRUL / ESTU LINGGA ERFILAENI' },
  { no: 8, nipd: '943', classId: 'cls-03', nisn: '3167997631', name: 'ELVI MAULIDIYA', birthPlace: 'Pasuruan', birthDate: '2016-12-14', gender: 'P', nik: '3514245412160001', agama: 'ISLAM', ortu: 'MULYADI / RINAWATI' },
  { no: 9, nipd: '944', classId: 'cls-03', nisn: '3160332746', name: 'GEA VANESSA NATALIA ELISABHET', birthPlace: 'Pasuruan', birthDate: '2016-12-23', gender: 'P', nik: '3514246312160002', agama: 'KRISTEN', ortu: 'SULASTRI' },
  { no: 10, nipd: '945', classId: 'cls-03', nisn: '3175975661', name: 'KRISTIAN ANGGARA', birthPlace: 'Malang', birthDate: '2017-08-13', gender: 'L', nik: '3514241308170002', agama: 'ISLAM', ortu: 'SUTRAM / RUPIATI' },
  { no: 11, nipd: '946', classId: 'cls-03', nisn: '3171678356', name: "NAVYSHA QUR'ANA MAULIDITA ANSARI", birthPlace: 'Malang', birthDate: '2017-11-29', gender: 'P', nik: '3514246911170001', agama: 'ISLAM', ortu: 'PUJI SETYO SLAMET / NINIK ANSARI' },
  { no: 12, nipd: '947', classId: 'cls-03', nisn: '3177088090', name: 'REFALDO ADI PRADANA', birthPlace: 'Pasuruan', birthDate: '2017-09-10', gender: 'L', nik: '3514241009170001', agama: 'HINDU', ortu: 'SAMPURNO / SUSI SUSANTI' },
  { no: 13, nipd: '948', classId: 'cls-03', nisn: '3172445327', name: 'TIRTA DANA DYAKSA SWANDIRA', birthPlace: 'Pasuruan', birthDate: '2018-07-14', gender: 'P', nik: '3514245407180001', agama: 'HINDU', ortu: 'LIDIAWATI' },
  { no: 14, nipd: '966', classId: 'cls-03', nisn: '3173954675', name: 'TEGUH GADA SUTRA', birthPlace: 'Malang', birthDate: '2017-09-17', gender: 'L', nik: '3514241709170001', agama: 'HINDU', ortu: 'AGUS WIJAYA / SINDI DHARMA WULANDARI' },
  { no: 15, nipd: '949', classId: 'cls-03', nisn: '3179373356', name: 'VANISA PUTRI', birthPlace: 'Pasuruan', birthDate: '2017-02-06', gender: 'P', nik: '3514244602170001', agama: 'ISLAM', ortu: 'JUARNAM / SUPRIASIH' },
  { no: 16, nipd: '950', classId: 'cls-03', nisn: '3178044230', name: 'ZIVANO VIKO DIDAN ALVARO', birthPlace: 'Pasuruan', birthDate: '2017-07-30', gender: 'L', nik: '3514243007170001', agama: 'HINDU', ortu: 'PUJI ANTOKO / RANI RAMAWATI' },

  // KELAS IV (9)
  { no: 1, nipd: '927', classId: 'cls-04', nisn: '0162900892', name: 'ADEL SAFIRA', birthPlace: 'Pasuruan', birthDate: '2016-03-12', gender: 'P', nik: '3514245203160001', agama: 'HINDU', ortu: 'ANDIK SISWANTO / SRI HANDAYANI' },
  { no: 2, nipd: '928', classId: 'cls-04', nisn: '0168060947', name: 'AL VINO GIOTAMA PUTRA', birthPlace: 'Pasuruan', birthDate: '2016-11-08', gender: 'L', nik: '3514240811160001', agama: 'HINDU', ortu: 'ADI SUTIKO / SUMIATI' },
  { no: 3, nipd: '929', classId: 'cls-04', nisn: '3168210092', name: 'BILY AGUSTINO', birthPlace: 'Pasuruan', birthDate: '2016-08-01', gender: 'L', nik: '3514240108150002', agama: 'ISLAM', ortu: 'SUGIANTO / KARMENI' },
  { no: 4, nipd: '930', classId: 'cls-04', nisn: '0176410079', name: 'CRISTO ALVANY BAYU PRADANA', birthPlace: 'Pasuruan', birthDate: '2017-01-03', gender: 'L', nik: '3514240108150002', agama: 'HINDU', ortu: 'ANDRIAN WIDIA PRATAMA / SRI ANANTASARI' },
  { no: 5, nipd: '931', classId: 'cls-04', nisn: '0168957870', name: 'DAFIANO ALFIN FIRDAN SAPUTRA', birthPlace: 'Pasuruan', birthDate: '2016-06-24', gender: 'L', nik: '3514242406160001', agama: 'HINDU', ortu: 'SUTRIS / INGSE KRISTIYA PUSPA DIANA' },
  { no: 6, nipd: '932', classId: 'cls-04', nisn: '3164187862', name: 'DITO SETIAWAN', birthPlace: 'Pasuruan', birthDate: '2016-05-16', gender: 'L', nik: '3514241605160001', agama: 'ISLAM', ortu: 'NARKO / RAWATI' },
  { no: 7, nipd: '933', classId: 'cls-04', nisn: '0162550415', name: 'SISKIA AUDIA KIRANA', birthPlace: 'Pasuruan', birthDate: '2016-10-28', gender: 'P', nik: '3514246810160001', agama: 'HINDU', ortu: 'SISWANTO / IKA WINNARMI' },
  { no: 8, nipd: '934', classId: 'cls-04', nisn: '0167520677', name: 'VIKI JULIANO WISNO WARDANA', birthPlace: 'Pasuruan', birthDate: '2016-07-28', gender: 'L', nik: '3514242807160001', agama: 'HINDU', ortu: 'WAHYUDI / WIYA YUNITA PURNAMA SARI' },
  { no: 9, nipd: '935', classId: 'cls-04', nisn: '3162471314', name: 'ZILDAN STIFEN GIOGENINO', birthPlace: 'Pasuruan', birthDate: '2016-08-14', gender: 'L', nik: '3514241408160001', agama: 'ISLAM', ortu: 'SUTRISNO / MINARSIH' },

  // KELAS V (19)
  { no: 1, nipd: '908', classId: 'cls-05', nisn: '0153191795', name: 'BINTANG RADITYA SEPTIANO PUTRA', birthPlace: 'Pasuruan', birthDate: '2015-09-10', gender: 'L', nik: '3514241009150001', agama: 'HINDU', ortu: 'DONI ARIAWAN / IKA NURWITA SARI' },
  { no: 2, nipd: '909', classId: 'cls-05', nisn: '3158296360', name: 'CHIKA DWI SEPRILIA', birthPlace: 'Pasuruan', birthDate: '2015-06-29', gender: 'P', nik: '3514246906150001', agama: 'HINDU', ortu: 'SAIFUL ANWAR / SUKIATI' },
  { no: 3, nipd: '910', classId: 'cls-05', nisn: '0144845294', name: 'DEFIAN ADI SASTRA', birthPlace: 'Pasuruan', birthDate: '2014-12-08', gender: 'L', nik: '3514240812140001', agama: 'HINDU', ortu: 'BUDI KARSONO / ULFA SUSIYO WAHYUNI' },
  { no: 4, nipd: '911', classId: 'cls-05', nisn: '0156884573', name: 'DENA ELISTIA', birthPlace: 'Pasuruan', birthDate: '2015-01-01', gender: 'P', nik: '3514244101150001', agama: 'HINDU', ortu: 'WINARTO / PONITI' },
  { no: 5, nipd: '912', classId: 'cls-05', nisn: '3153984777', name: 'DENDI ARIYANDO GESTA PRATAMA', birthPlace: 'Pasuruan', birthDate: '2015-10-14', gender: 'L', nik: '3514241410150001', agama: 'HINDU', ortu: 'PENDI / DEWI PUJI ANGGRAENI' },
  { no: 6, nipd: '913', classId: 'cls-05', nisn: '0152423891', name: 'DEVINA GISELLIYA PUTRI', birthPlace: 'Pasuruan', birthDate: '2015-09-06', gender: 'P', nik: '3514244609150001', agama: 'ISLAM', ortu: 'WARNO HADI / SRI ASTUTIK' },
  { no: 7, nipd: '914', classId: 'cls-05', nisn: '0157481919', name: 'IRFAN ANDRI SAPUTRA', birthPlace: 'Pasuruan', birthDate: '2015-06-17', gender: 'L', nik: '3514241706150001', agama: 'ISLAM', ortu: 'SATURI / SUKARTIN' },
  { no: 8, nipd: '915', classId: 'cls-05', nisn: '0157883555', name: 'JESIKA MUTIARA CINTA', birthPlace: 'Pasuruan', birthDate: '2015-10-09', gender: 'P', nik: '3514244910150001', agama: 'HINDU', ortu: 'PRIYO HANDOKO / SINTA DEWI LESTARI' },
  { no: 9, nipd: '916', classId: 'cls-05', nisn: '0152469379', name: 'KLEDI ARJUNA SADEWA PRATAMA', birthPlace: 'Pasuruan', birthDate: '2015-06-09', gender: 'L', nik: '3514240906150001', agama: 'HINDU', ortu: 'HARMOKO / PONAMI' },
  { no: 10, nipd: '917', classId: 'cls-05', nisn: '0154644784', name: 'KLLEO VITO DAFASTU', birthPlace: 'Pasuruan', birthDate: '2015-12-22', gender: 'L', nik: '3514242212150001', agama: 'HINDU', ortu: 'KARTOYO / WIDYAWATI NINGSIH' },
  { no: 11, nipd: '918', classId: 'cls-05', nisn: '0159352347', name: 'MIEKAYLLA CELISTHA PUTRI', birthPlace: 'Pasuruan', birthDate: '2015-02-07', gender: 'P', nik: '3514244702150001', agama: 'HINDU', ortu: 'MISTAJI / LILIK SETIA RAHAYU' },
  { no: 12, nipd: '919', classId: 'cls-05', nisn: '0152942762', name: 'MUHAMMAD ALFIAN', birthPlace: 'Pasuruan', birthDate: '2015-09-12', gender: 'L', nik: '3514241209150001', agama: 'ISLAM', ortu: 'HOLEK / KUMIATI' },
  { no: 13, nipd: '920', classId: 'cls-05', nisn: '3168128200', name: "MUHAMMAD ASKA ASSIFA'UL FADILAH", birthPlace: 'Pasuruan', birthDate: '2016-01-26', gender: 'L', nik: '3514242601160001', agama: 'ISLAM', ortu: 'IRAWAN / RIATI' },
  { no: 14, nipd: '921', classId: 'cls-05', nisn: '3155672334', name: 'NADIRA SHERYL FIORENSA', birthPlace: 'Pasuruan', birthDate: '2015-07-04', gender: 'P', nik: '3514244407150001', agama: 'HINDU', ortu: 'KUSDIANTO / KRISTINA' },
  { no: 15, nipd: '922', classId: 'cls-05', nisn: '0152703384', name: 'NARADA OKTAVIA', birthPlace: 'Pasuruan', birthDate: '2015-10-02', gender: 'P', nik: '3514244210150001', agama: 'HINDU', ortu: 'AGUS / JAYANTI' },
  { no: 16, nipd: '923', classId: 'cls-05', nisn: '3155330169', name: 'VANESSA ARIVIA PUTRI', birthPlace: 'Pasuruan', birthDate: '2015-01-19', gender: 'P', nik: '3514245901150001', agama: 'KRISTEN', ortu: 'ARI PUTRA UTAMA / OLIVIA KRISTIATMO' },
  { no: 17, nipd: '924', classId: 'cls-05', nisn: '0156556317', name: 'VANIKA NOVA GIZELDA', birthPlace: 'Pasuruan', birthDate: '2015-03-23', gender: 'P', nik: '3514246303150001', agama: 'HINDU', ortu: 'MUJIONO / RINI' },
  { no: 18, nipd: '925', classId: 'cls-05', nisn: '0152827414', name: 'VIRJINIA VARENSI REVIYA PUTRI', birthPlace: 'Pasuruan', birthDate: '2015-07-12', gender: 'P', nik: '3514245207150001', agama: 'HINDU', ortu: 'TRI WIJAYA SUDIOMAKARYO / RENI KUSUMA WATI' },
  { no: 19, nipd: '926', classId: 'cls-05', nisn: '0153078147', name: 'YEFVA KRISYA KERTA NUGRAHA', birthPlace: 'Pasuruan', birthDate: '2015-09-22', gender: 'L', nik: '3514242209150001', agama: 'HINDU', ortu: 'SUTRISNO / SUSIATI' },

  // KELAS VI (9)
  { no: 1, nipd: '899', classId: 'cls-06', nisn: '0143580529', name: 'ADE SEPTYANO PRADITYE', birthPlace: 'Pasuruan', birthDate: '2014-09-30', gender: 'L', nik: '3514243009140001', agama: 'HINDU', ortu: 'HANDOKO / KRISTINA SRI WILIS' },
  { no: 2, nipd: '900', classId: 'cls-06', nisn: '0145006031', name: 'AZWA AZZAHRA RHAMADHANI', birthPlace: 'Pasuruan', birthDate: '2014-07-03', gender: 'P', nik: '3514244307140001', agama: 'ISLAM', ortu: 'SAMSUL HADI / SRI YUANITA' },
  { no: 3, nipd: '901', classId: 'cls-06', nisn: '0141818784', name: 'DESTA ANDRO ELFA NIKO', birthPlace: 'Pasuruan', birthDate: '2014-07-10', gender: 'L', nik: '3514241007140002', agama: 'HINDU', ortu: 'MISTAJI / JINARTI' },
  { no: 4, nipd: '902', classId: 'cls-06', nisn: '0149834461', name: 'EVAN NUGRAHA', birthPlace: 'Pasuruan', birthDate: '2014-07-08', gender: 'L', nik: '3514240807140001', agama: 'HINDU', ortu: 'SUNARKO / IKE PRASETYA NINGSIH' },
  { no: 5, nipd: '903', classId: 'cls-06', nisn: '0148043715', name: 'FACHRIZAL ULUMIDIN', birthPlace: 'Pasuruan', birthDate: '2014-06-03', gender: 'L', nik: '3514240306140001', agama: 'ISLAM', ortu: 'SLAMET / PURWATI' },
  { no: 6, nipd: '904', classId: 'cls-06', nisn: '3149846717', name: 'GITA OKTAVIA', birthPlace: 'Pasuruan', birthDate: '2014-10-06', gender: 'P', nik: '3514244610140001', agama: 'HINDU', ortu: 'SUGIANTO / YULIANAH' },
  { no: 7, nipd: '905', classId: 'cls-06', nisn: '0147671134', name: "MUHAMMAD FAIZ AL'FARIZI", birthPlace: 'Pasuruan', birthDate: '2014-08-08', gender: 'L', nik: '3514240808140001', agama: 'ISLAM', ortu: 'SUPRIADI / ISMIATI' },
  { no: 8, nipd: '906', classId: 'cls-06', nisn: '0149652457', name: 'RADHEA DECA PUJA NOSTAGA', birthPlace: 'Pasuruan', birthDate: '2014-11-15', gender: 'L', nik: '3514241511140001', agama: 'HINDU', ortu: 'SULISWANTO / TRISNI WATI' },
  { no: 9, nipd: '907', classId: 'cls-06', nisn: '0142385025', name: 'REVA DARMA DUWI SANTOSO', birthPlace: 'Pasuruan', birthDate: '2014-06-19', gender: 'L', nik: '3514241906140001', agama: 'HINDU', ortu: 'PURWONO / MINDARSIH' },
];

async function syncToDatabase(dbName, queryFn) {
  console.log(`\n========================================`);
  console.log(`🚀 Sinkronisasi ke ${dbName}...`);
  console.log(`========================================`);

  let studentSuccess = 0;
  let guardianSuccess = 0;
  let qrSuccess = 0;

  for (const s of RAW_STUDENTS) {
    const address = 'Dusun Krajan, Desa Kandangan, Kec. Tosari';

    // 1. Cek apakah siswa sudah ada berdasarkan school_id dan nis
    const existing = await queryFn(
      `SELECT id FROM students WHERE school_id = $1 AND nis = $2;`,
      [SCHOOL_ID, s.nipd]
    );

    let studentId;
    if (existing.rows && existing.rows.length > 0) {
      studentId = existing.rows[0].id;
      await queryFn(
        `UPDATE students 
         SET full_name = $1, current_class_id = $2, nisn = $3, gender = $4, birth_place = $5, birth_date = $6, address = $7, status = 'AKTIF', updated_at = NOW()
         WHERE id = $8;`,
        [s.name, s.classId, s.nisn, s.gender, s.birthPlace, s.birthDate, address, studentId]
      );
    } else {
      studentId = crypto.randomUUID();
      await queryFn(
        `INSERT INTO students (
           id, school_id, current_class_id, nis, nisn, full_name, gender, birth_place, birth_date, address, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'AKTIF', NOW(), NOW());`,
        [studentId, SCHOOL_ID, s.classId, s.nipd, s.nisn, s.name, s.gender, s.birthPlace, s.birthDate, address]
      );
    }
    studentSuccess++;

    // 2. Buat atau perbarui QR Token jika belum ada yang aktif
    const existingQr = await queryFn(
      `SELECT id FROM qr_tokens WHERE entity_type = 'STUDENT' AND entity_id = $1 AND is_revoked = false;`,
      [studentId]
    );

    if (!existingQr.rows || existingQr.rows.length === 0) {
      const token = `TOSARI-STU-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
      await queryFn(
        `INSERT INTO qr_tokens (
           id, school_id, entity_type, entity_id, token, version, is_revoked, issued_at, created_at
         ) VALUES ($1, $2, 'STUDENT', $3, $4, 1, false, NOW(), NOW());`,
        [crypto.randomUUID(), SCHOOL_ID, studentId, token]
      );
      qrSuccess++;
    }

    // 3. Sinkronisasi Data Orang Tua / Wali Murid
    if (s.ortu) {
      const parentName = s.ortu.trim();
      const parentRel = parentName.includes('/') ? 'Orang Tua' : (parentName.includes('IBU') ? 'Ibu' : 'Orang Tua');

      // Cek apakah siswa sudah memiliki relasi di student_guardians
      const existingLink = await queryFn(
        `SELECT guardian_id FROM student_guardians WHERE student_id = $1;`,
        [studentId]
      );

      let guardianId;
      if (existingLink.rows && existingLink.rows.length > 0) {
        guardianId = existingLink.rows[0].guardian_id;
        await queryFn(
          `UPDATE guardians SET full_name = $1, relationship = $2, updated_at = NOW() WHERE id = $3;`,
          [parentName, parentRel, guardianId]
        );
      } else {
        // Cek apakah wali dengan nama ini sudah ada di sekolah
        const existingG = await queryFn(
          `SELECT id FROM guardians WHERE school_id = $1 AND full_name = $2;`,
          [SCHOOL_ID, parentName]
        );

        if (existingG.rows && existingG.rows.length > 0) {
          guardianId = existingG.rows[0].id;
        } else {
          guardianId = crypto.randomUUID();
          await queryFn(
            `INSERT INTO guardians (
               id, school_id, full_name, relationship, phone, is_phone_verified, whatsapp_active, address, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, '-', false, false, $5, NOW(), NOW());`,
            [guardianId, SCHOOL_ID, parentName, parentRel, address]
          );
        }

        // Tautkan ke student_guardians
        await queryFn(
          `INSERT INTO student_guardians (
             id, guardian_id, student_id, is_verified, verified_by, verified_at, notes, created_at
           ) VALUES ($1, $2, $3, true, $4, NOW(), 'Data Dapodik Siswa SDN Kandangan I Tosari TP 2026/2027', NOW())
           ON CONFLICT DO NOTHING;`,
          [crypto.randomUUID(), guardianId, studentId, ADMIN_USER_ID]
        );
      }
      guardianSuccess++;
    }
  }

  console.log(`✅ [${dbName}] Berhasil memproses:`);
  console.log(`   - ${studentSuccess} Data Siswa`);
  console.log(`   - ${guardianSuccess} Data Wali & Relasi Siswa`);
  console.log(`   - ${qrSuccess} QR Token Baru`);

  // Tampilkan ringkasan per kelas
  const summary = await queryFn(
    `SELECT c.name as kelas, COUNT(s.id) as total_siswa
     FROM classes c
     LEFT JOIN students s ON s.current_class_id = c.id AND s.status = 'AKTIF'
     WHERE c.school_id = $1
     GROUP BY c.id, c.name, c.grade_level
     ORDER BY c.grade_level ASC;`,
    [SCHOOL_ID]
  );
  console.log('\n📊 Ringkasan Siswa per Kelas:');
  console.table(summary.rows);
}

async function main() {
  console.log(`Total data siswa yang akan dimasukkan: ${RAW_STUDENTS.length} siswa.`);

  // 1. Sinkronisasi ke Supabase PostgreSQL
  const supabaseUrl = 'postgresql://postgres.ektutwerkupziymvacuv:%40KhmadShodikin85@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
  const pool = new Pool({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await syncToDatabase('Supabase Cloud Database (Production)', async (text, params) => {
      return await pool.query(text, params);
    });
  } catch (err) {
    console.error('❌ Gagal sinkronisasi ke Supabase:', err);
  } finally {
    await pool.end();
  }

  // 2. Sinkronisasi ke Local PGlite
  const pgliteDir = path.resolve(process.cwd(), 'data', 'pglite');
  if (!fs.existsSync(pgliteDir)) {
    fs.mkdirSync(pgliteDir, { recursive: true });
  }
  const pglite = new PGlite(pgliteDir);

  try {
    await syncToDatabase('Local PGlite Database (Development)', async (text, params) => {
      return await pglite.query(text, params);
    });
  } catch (err) {
    console.error('❌ Gagal sinkronisasi ke PGlite:', err);
  }

  console.log('\n🎉 SEMUA DATA SISWA TELAH BERHASIL DIMASUKKAN!');
}

main().catch(console.error);
