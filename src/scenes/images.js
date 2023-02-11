const pexel = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

const images = [
  // Back
  { rotation: [0, 0, 0], url: pexel(416430) },
  { rotation: [0, 0, 0], url: pexel(310452) },
  // Left
  { rotation: [0, 0, 0], url: pexel(327482) },
  { rotation: [0, 0, 0], url: pexel(325185) },
  { rotation: [0, 0, 0], url: pexel(358574) },
  // Right
  { rotation: [0, 0, 0], url: pexel(227675) },
  { rotation: [0, 0, 0], url: pexel(911738) },
  { rotation: [0, 0, 0], url: pexel(1738986) },
];

export default images;
