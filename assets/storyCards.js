import { r as React, j as jsx } from './r3f-BNacQy8Q.js';

// how many paragraphs go on each card (from spacecraft_stories_cards.docx)
var cardGroups = {
  'apollo11-eagle': [2, 1, 2],
  'apollo11-lrrr': [2, 2, 1],
  'apollo15-lrv': [2, 1, 2],
  'apollo16-lrv': [2, 1, 2],
  'apollo17-lrv': [2, 2, 1],
  'surveyor3': [1, 2, 2],
  'viking1': [2, 1, 2],
  'viking2': [1, 2, 2],
  'pathfinder': [2, 2, 1],
  'spirit': [2, 1, 2],
  'opportunity': [2, 1, 2],
  'phoenix': [1, 2, 2],
  'insight': [2, 2, 1],
  'ingenuity': [2, 2, 1],
  'perseverance': [2, 1, 2],
  'voyager1': [2, 2, 1],
  'voyager2': [2, 1, 2],
  'pioneer10': [2, 1, 2],
  'pioneer11': [2, 1, 2],
  'newhorizons': [2, 2, 1]
};

var flipSound = new Audio('./assets/sfx/card-flip.mp3');
flipSound.preload = 'auto';

// a copy each time so quick flips can overlap
function playFlip() {
  var copy = flipSound.cloneNode();
  copy.play().catch(function () {});
}

function makeParts(story, id) {
  var counts = cardGroups[id];
  var total = 0;
  var parts = [];
  var spot = 0;
  var size;
  var i;
  var j;
  var part;

  if (story.length === 0) return parts;

  if (counts) {
    for (i = 0; i < counts.length; i++) {
      total = total + counts[i];
    }
  }

  // no saved split (or it doesn't fit), so just cut it into 3 chunks
  if (!counts || total !== story.length) {
    size = Math.max(1, Math.ceil(story.length / 3));
    counts = [];
    for (i = 0; i < story.length; i += size) {
      counts.push(Math.min(size, story.length - i));
    }
  }

  for (i = 0; i < counts.length; i++) {
    part = [];
    for (j = 0; j < counts[i]; j++) {
      part.push(story[spot]);
      spot++;
    }
    parts.push(part);
  }
  return parts;
}

export default function StoryCards(props) {
  var t = props.t;
  var parts = makeParts(props.story, props.id);
  var flipState = React.useState(function () {
    var start = [];
    var k;
    for (k = 0; k < parts.length; k++) {
      start.push(false);
    }
    return start;
  });
  var flipped = flipState[0];
  var setFlipped = flipState[1];
  var timers = React.useRef([]);
  var listRef = React.useRef(null);
  var flippedNow = React.useRef(flipped);
  var allOpen = true;
  var cards = [];
  var i;

  for (i = 0; i < parts.length; i++) {
    if (!flipped[i]) allOpen = false;
  }

  flippedNow.current = flipped;

  // open cards grow to fit their text, closed ones go back to the css height
  function fitCards() {
    var list = listRef.current;
    var k;
    var back;
    if (!list) return;
    for (k = 0; k < list.children.length; k++) {
      back = list.children[k].querySelector('.storyCardBack');
      list.children[k].style.height = flippedNow.current[k] ? back.scrollHeight + 'px' : '';
    }
  }

  React.useEffect(fitCards, [flipped]);

  // text wraps differently when the window changes size
  React.useEffect(function () {
    window.addEventListener('resize', fitCards);
    return function () {
      window.removeEventListener('resize', fitCards);
    };
  }, []);

  // clear any waiting timers when the card set goes away
  React.useEffect(function () {
    return function () {
      var k;
      for (k = 0; k < timers.current.length; k++) {
        window.clearTimeout(timers.current[k]);
      }
    };
  }, []);

  function makeSetter(index, open) {
    return function () {
      playFlip();
      setFlipped(function (old) {
        var next = old.slice();
        next[index] = open;
        return next;
      });
    };
  }

  // one card, from its front or its back button
  function makeFlipper(index, open) {
    return function (event) {
      var turn = event.currentTarget.closest('.storyCardTurn');
      makeSetter(index, open)();
      // the face with the button goes hidden, so move focus to the other one
      window.setTimeout(function () {
        var next = turn.querySelector(open ? '.storyCardBack' : '.storyCardFront');
        if (next) next.focus({ preventScroll: true });
      }, 0);
    };
  }

  // every card, one after another so it ripples down
  function setAll(open) {
    var gap = props.reduceMotion ? 0 : 140;
    var wait = 0;
    var k;
    for (k = 0; k < timers.current.length; k++) {
      window.clearTimeout(timers.current[k]);
    }
    timers.current = [];
    for (k = 0; k < parts.length; k++) {
      if (flipped[k] !== open) {
        timers.current.push(window.setTimeout(makeSetter(k, open), wait));
        wait = wait + gap;
      }
    }
  }

  for (i = 0; i < parts.length; i++) {
    var partLabel = t('story.part', { n: i + 1, total: parts.length });
    var paragraphs = [];
    var p;
    for (p = 0; p < parts[i].length; p++) {
      paragraphs.push(jsx.jsx('p', { children: parts[i][p] }, p));
    }

    cards.push(jsx.jsx('div', {
      className: 'storyCard',
      'data-flipped': flipped[i] ? 'true' : undefined,
      children: jsx.jsxs('div', {
        className: 'storyCardTurn',
        children: [
          jsx.jsxs('button', {
            type: 'button',
            className: 'storyCardFront',
            onClick: makeFlipper(i, true),
            'aria-expanded': Boolean(flipped[i]),
            'aria-label': partLabel + '. ' + t('story.reveal'),
            children: [
              jsx.jsx('span', { className: 'storyCardNumber', 'aria-hidden': 'true', children: i + 1 }),
              jsx.jsx('span', { className: 'storyCardPart', children: partLabel }),
              jsx.jsx('span', { className: 'storyCardHint', children: t('story.reveal') })
            ]
          }, 'front'),
          jsxBack(paragraphs, partLabel, makeFlipper(i, false))
        ]
      })
    }, i));
  }

  return jsx.jsxs('section', {
    children: [
      jsx.jsxs('div', {
        className: 'mb-2 flex items-center justify-between gap-2',
        children: [
          jsx.jsx('h3', { className: 'label m-0', children: t('section.story') }),
          jsx.jsx('button', {
            type: 'button',
            className: allOpen
              ? 'text-xs text-muted underline underline-offset-2 hover:text-amber'
              : 'text-xs text-amber underline underline-offset-2 hover:text-ink',
            onClick: function () { setAll(!allOpen); },
            children: allOpen ? t('wake.replay') : t('wake.skip')
          })
        ]
      }),
      jsx.jsx('div', { className: 'storyCardList', ref: listRef, children: cards })
    ]
  });
}

// back of a card, kept out of the loop so it stays readable
function jsxBack(paragraphs, partLabel, turnBack) {
  return jsx.jsxs('div', {
    className: 'storyCardBack',
    role: 'button',
    tabIndex: 0,
    onClick: turnBack,
    onKeyDown: function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        turnBack(event);
      }
    },
    children: [
      jsx.jsx('div', { className: 'storyCardText', children: paragraphs }),
      jsx.jsx('div', { className: 'storyCardFoot', children: jsx.jsx('span', { className: 'storyCardPart', children: partLabel }) })
    ]
  }, 'back');
}