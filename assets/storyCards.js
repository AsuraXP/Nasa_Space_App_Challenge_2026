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

// story id -> folder name inside assets/Voice (each has card-1, card-2, card-3 with narration.mp3)
var voiceFolders = {
  'apollo11-eagle': '01-eagle-descent-stage',
  'apollo11-lrrr': '02-laser-ranging-retroreflector',
  'apollo15-lrv': '03-lunar-roving-vehicle-1',
  'apollo16-lrv': '04-lunar-roving-vehicle-2',
  'apollo17-lrv': '05-lunar-roving-vehicle-3',
  'surveyor3': '06-surveyor-3',
  'viking1': '07-viking-1-lander',
  'viking2': '08-viking-2-lander',
  'pathfinder': '09-pathfinder-and-sojourner',
  'spirit': '10-spirit',
  'opportunity': '11-opportunity',
  'phoenix': '12-phoenix',
  'insight': '13-insight',
  'ingenuity': '14-ingenuity',
  'perseverance': '15-perseverance',
  'voyager1': '16-voyager-1',
  'voyager2': '17-voyager-2',
  'pioneer10': '18-pioneer-10',
  'pioneer11': '19-pioneer-11',
  'newhorizons': '20-new-horizons'
};

function narrationUrl(id, index) {
  var folder = voiceFolders[id];
  if (!folder) return null;
  return './assets/Voice/' + folder + '/card-' + (index + 1) + '/narration.mp3';
}

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
  var playState = React.useState(-1);
  var playing = playState[0];
  var setPlaying = playState[1];
  var voiceRef = React.useRef(null);
  var runId = React.useRef(0);
  var playingNow = React.useRef(-1);
  var allOpen = true;
  var cards = [];
  var i;

  for (i = 0; i < parts.length; i++) {
    if (!flipped[i]) allOpen = false;
  }

  flippedNow.current = flipped;
  playingNow.current = playing;

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

  // stop whatever narration is playing (and cancel a play-all chain)
  function stopVoice() {
    runId.current = runId.current + 1;
    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current.onended = null;
      voiceRef.current.onerror = null;
    }
    setPlaying(-1);
  }

  // play one card's narration; with chain on, carry on to the next card when it ends
  function playVoice(index, chain) {
    var url = narrationUrl(props.id, index);
    var mine;
    var audio;
    stopVoice();
    if (!url) return;
    mine = runId.current;
    audio = voiceRef.current || new Audio();
    voiceRef.current = audio;
    audio.src = url;
    audio.onended = function () {
      if (runId.current !== mine) return;
      if (chain && index + 1 < parts.length) {
        playVoice(index + 1, true);
      } else {
        setPlaying(-1);
      }
    };
    audio.onerror = function () {
      if (runId.current !== mine) return;
      setPlaying(-1);
    };
    setPlaying(index);
    audio.play().catch(function () {
      if (runId.current === mine) setPlaying(-1);
    });
  }

  // stop the voice if the card set goes away
  React.useEffect(function () {
    return function () {
      runId.current = runId.current + 1;
      if (voiceRef.current) voiceRef.current.pause();
    };
  }, []);

  function makeSetter(index, open) {
    return function () {
      playFlip();
      if (!open && playingNow.current === index) stopVoice();
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
    if (open) {
      playVoice(0, true);
    } else {
      stopVoice();
    }
    for (k = 0; k < parts.length; k++) {
      if (flipped[k] !== open) {
        timers.current.push(window.setTimeout(makeSetter(k, open), wait));
        wait = wait + gap;
      }
    }
  }

  // sound button on a card: play this part, or stop if it is already playing
  function makeSoundToggle(index) {
    return function () {
      if (playingNow.current === index) {
        stopVoice();
      } else {
        playVoice(index, false);
      }
    };
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
          jsxBack(paragraphs, partLabel, makeFlipper(i, false), narrationUrl(props.id, i) ? makeSoundToggle(i) : null, playing === i, t)
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
function jsxBack(paragraphs, partLabel, turnBack, toggleSound, isPlaying, t) {
  var foot = [jsx.jsx('span', { className: 'storyCardPart', children: partLabel }, 'part')];
  if (toggleSound) {
    foot.push(jsx.jsx('button', {
      type: 'button',
      className: 'storyCardSound' + (isPlaying ? ' is-playing' : ''),
      'aria-pressed': isPlaying,
      'aria-label': isPlaying ? t('story.stopNarration') : t('story.playNarration'),
      title: isPlaying ? t('story.stopNarration') : t('story.playNarration'),
      onClick: function (event) {
        event.stopPropagation();
        toggleSound();
      },
      onKeyDown: function (event) {
        // keep Enter/Space from also turning the card back
        event.stopPropagation();
      },
      children: jsx.jsx('svg', {
        viewBox: '0 0 24 24',
        width: 18,
        height: 18,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        children: isPlaying
          ? [
              jsx.jsx('rect', { x: 6, y: 5, width: 4, height: 14, fill: 'currentColor' }, 'a'),
              jsx.jsx('rect', { x: 14, y: 5, width: 4, height: 14, fill: 'currentColor' }, 'b')
            ]
          : [
              jsx.jsx('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5', fill: 'currentColor' }, 'a'),
              jsx.jsx('path', { d: 'M15.5 8.5a5 5 0 0 1 0 7' }, 'b'),
              jsx.jsx('path', { d: 'M19 5a10 10 0 0 1 0 14' }, 'c')
            ]
      })
    }, 'sound'));
  }
  return jsx.jsxs('div', {
    className: 'storyCardBack',
    role: 'button',
    tabIndex: 0,
    onClick: turnBack,
    onKeyDown: function (event) {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        turnBack(event);
      }
    },
    children: [
      jsx.jsx('div', { className: 'storyCardText', children: paragraphs }),
      jsx.jsx('div', { className: 'storyCardFoot', children: foot })
    ]
  }, 'back');
}
