import type { MissionCity } from '../../content/missions';

// Adjacent waypoints follow the lane or path in Tiled. A directed arc may
// include a signed crossing. The route validator checks every arc in context.
export const corridors = {
  warszawa: [
    [
      'bulwar_noc_start',
      'bulwar_poludnie',
      'bulwar_srodek',
      'bulwary_noca',
      'bulwar_polnoc',
      'starowka_lacznik',
    ],
    [
      'most_detektyw_start',
      'most_detektyw_srodek',
      'most_detektyw_foto',
      'przyczolek_mostu',
      'pod_zebra',
      'za_zebra',
    ],
    ['palac_ddr_wjazd', 'palac_ddr_przed', 'palac_ddr_za', 'palac_serwis'],
    ['palac_ddr_przed', 'palac_s2_postoj'],
    ['palac_strzalka_start', 'palac_strzalka_przed', 'palac_strzalka_za'],
    [
      'palac_tram_start',
      'palac_tram_przed',
      'palac_tram_stop',
      'palac_tram_meta',
    ],
    ['mokotow_kolej_start', 'mokotow_kolej_przed', 'mokotow_kolej_za'],
    ['mokotow_stacja_przed', 'mokotow_kolej_meta', 'kolej_wschod'],
    [
      'lazienki_frank_start',
      'lazienki_ciag',
      'lazienki_aleja',
      'fontanny_poludnie',
      'park_powrot',
    ],
    ['bazar_praga', 'cp_bazar', 'podejscie_do_stop', 'przez_stop'],
    [
      'stadion_wjazd',
      'stadion_trening_zachod',
      'stadion_trening_wschod',
      'stadion_trening_brama',
      'stadion_wjazd',
      'stadion_nawrot',
    ],
    ['lodziarnia', 'kamienny_rynek', 'przed_deptakiem'],
    ['kontraruch_a', 'kontraruch_b'],
    ['mokotow_pobocze_start', 'mokotow_pobocze_koniec'],
    ['mokotow_pobocze_poludnie', 'mokotow_za_torami', 'mokotow_przed_torami'],
    ['park_zakaz_a', 'park_zakaz_b'],
    ['podworko_praga', 'przed_brama', 'za_brama', 'cp_bramy'],
  ],
  wroclaw: [
    [
      'most-tumski-polnoc',
      'ostrow-latarnie',
      'ostrow-przed',
      'most-tumski-poludnie',
      'rynek-zachodni',
    ],
    ['most-tumski-poludnie', 'rynek-foto-d1', 'rynek-foto-a7'],
    ['hala-ddr', 'hala-lacznik', 'zoo-ciag', 'zoo-polowa', 'zoo-brama'],
    [
      'bulwar-start',
      'bulwar-wschod',
      'bulwar-rynek',
      'bulwar-most',
      'bulwar-dalej',
      'bulwar-meta',
    ],
    ['dworzec-pas-start', 'sky-p23', 'sky-pas-koniec'],
    ['nadodrze-start', 'nadodrze-pas', 'nadodrze-meta'],
    ['slodowa-poludnie', 'slodowa-polnoc', 'slodowa-lody'],
    [
      'zachod-kolej-start',
      'zachod-kolej-miedzy',
      'zachod-kolej-meta',
      'zachod-pobocze',
    ],
    ['zachod_pobocze_a', 'zachod_pobocze_b'],
    ['nadodrze_a', 'nadodrze_b'],
    [
      'zachod_stop_pobocze',
      'zachod_stop_koniec',
      'zachod_stop_wlot',
      'zachod_stop_wylot',
    ],
    ['zachod_zakaz', 'zachod_objazd_polnoc'],
    ['ostrow_strefa_a', 'ostrow_strefa_b'],
    ['wyjazd_magazyn_a', 'wyjazd_magazyn_b', 'wyjazd_magazyn_c'],
    ['poludnie_tram_a', 'poludnie_tram_b'],
    ['rynek-start', 'dzwoneczek', 'krasnal-2', 'krasnal-3'],
    ['sky-ddr', 'dworzec-przejazd-przed', 'dworzec-przejazd-za'],
    ['rynek-polnoc', 'zebra-poludnie', 'zebra-polnoc'],
    ['dworzec-przystanek', 'dworzec-wejscie', 'dworzec-glowny'],
  ],
} as const satisfies Record<MissionCity, readonly (readonly string[])[]>;

// Additional waypoints within existing Tiled corridors, in map pixels. The
// authored map remains the authority for walls, access, crossings and signs.
export const waypoints: Record<
  MissionCity,
  Record<string, readonly [number, number]>
> = {
  warszawa: {
    mokotow_pobocze_start: [3376, 2130],
    mokotow_pobocze_koniec: [3376, 2550],
    palac_s2_postoj: [3378, 1779],
    mokotow_przed_torami: [3536, 3160],
    mokotow_za_torami: [3536, 3280],
    mokotow_pobocze_poludnie: [3536, 3510],
    kontraruch_a: [4096, 1770],
    kontraruch_b: [4096, 1625],
    park_zakaz_a: [3312, 2848],
    park_zakaz_b: [3376, 2848],
  },
  wroclaw: {
    zachod_stop_pobocze: [1040, 1930],
    zachod_stop_koniec: [1040, 1830],
    zachod_stop_wlot: [994, 1826],
    zachod_stop_wylot: [992, 1670],
    zachod_zakaz: [720, 3190],
    zachod_objazd_polnoc: [720, 3085],
    zachod_pobocze_a: [1040, 2660],
    zachod_pobocze_b: [1040, 1990],
    nadodrze_a: [3344, 1584],
    nadodrze_b: [3344, 1672],
    wyjazd_magazyn_a: [1240, 1608],
    wyjazd_magazyn_b: [1240, 1652],
    wyjazd_magazyn_c: [1240, 1740],
    ostrow_strefa_a: [2700, 1216],
    ostrow_strefa_b: [2700, 1340],
    poludnie_tram_a: [3650, 2852],
    poludnie_tram_b: [3810, 2852],
  },
};

export const raceCorridors = {
  warszawa: {
    rival: 'turbo-stadion',
    shortcut: 'stadion-skrot',
    points: [
      'stadion_wjazd',
      'stadion_trening_zachod',
      'stadion_trening_wschod',
      'stadion_trening_brama',
      'stadion_wjazd',
      'stadion_nawrot',
      'stadion_meta',
    ],
  },
  wroclaw: {
    rival: 'turbo-odra',
    shortcut: undefined,
    points: [
      'bulwar-start',
      'bulwar-wschod',
      'bulwar-rynek',
      'bulwar-most',
      'bulwar-dalej',
      'bulwar-meta',
    ],
  },
} as const;
