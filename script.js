const postDialog = document.querySelector('#postDialog');
const postForm = document.querySelector('#postForm');
const recordGrid = document.querySelector('#recordGrid');
const openForm = document.querySelector('#openForm');
const closeForm = document.querySelector('#closeForm');
const submitPost = document.querySelector('#submitPost');
const status = document.querySelector('#status');
const recordCount = document.querySelector('#recordCount');
const welcomeDialog = document.querySelector('#welcomeDialog');
const closeWelcome = document.querySelector('#closeWelcome');
const maxFileBytes = 25 * 1024 * 1024;
const config = window.SUPABASE_CONFIG || {};
const publishableKey = config.publishableKey || config.anonKey;
const isConfigured =
  /^https:\/\/.+\.supabase\.co$/i.test(config.url || '') &&
  Boolean(publishableKey);
const client = isConfigured
  ? window.supabase.createClient(config.url, publishableKey)
  : null;

const questions = [
  ['A MOMENT YOU REMEMBER', 'answer_one'],
  ["WHAT JUWON BROUGHT TO ROAST'D OR ITS COMMUNITY", 'answer_two'],
  ['NOTE FOR A FUTURE EMPLOYER', 'answer_three'],
];

function setStatus(message = '', isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function textNode(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

function postText(post) {
  return questions
    .map(([, key]) => post[key])
    .filter(Boolean)
    .join(' ');
}

function isKoreanText(value) {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value || '');
}

function createMeta(post) {
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.append(
    textNode(
      'span',
      '',
      `[${post.name.toUpperCase()} · ${(post.relationship || 'Shared record').toUpperCase()}]`,
    ),
  );
  meta.append(textNode('time', '', formatDate(post.created_at)));
  return meta;
}

function createAnswerList(post) {
  const list = document.createElement('div');
  list.className = 'answer-list';

  questions.forEach(([question, key]) => {
    const block = document.createElement('section');
    block.className = 'answer-block';
    block.append(textNode('p', 'answer-question', question));
    block.append(textNode('p', 'answer-copy', post[key]));
    list.append(block);
  });

  return list;
}

function createRecord(post) {
  const hasMedia = Boolean(post.media_url);
  const article = document.createElement('article');
  article.className = hasMedia ? 'record' : 'record no-media';
  if (isKoreanText(postText(post))) article.classList.add('record-korean');

  if (hasMedia) {
    const image = document.createElement('img');
    image.className = 'record-media';
    image.src = post.media_url;
    image.alt = `${post.name}'s shared photo`;
    image.loading = 'lazy';
    article.append(image);
  }

  const body = document.createElement('div');
  body.className = 'record-body';
  body.append(createMeta(post), createAnswerList(post));
  article.append(body);
  return article;
}

function updateRecordCount(total) {
  recordCount.textContent = `${total} ${total === 1 ? 'note' : 'notes'}`;
}

function renderEmpty() {
  if (recordGrid.children.length) return;
  recordGrid.append(
    textNode('p', 'empty', 'The first shared note will appear here.'),
  );
}

function closeOnBackdropClick(dialog) {
  dialog.addEventListener('click', (event) => {
    const { top, right, bottom, left } = dialog.getBoundingClientRect();
    const outside =
      event.clientX < left ||
      event.clientX > right ||
      event.clientY < top ||
      event.clientY > bottom;
    if (outside) dialog.close();
  });
}

function showWelcome() {
  if (!welcomeDialog) return;
  welcomeDialog.showModal();
  welcomeDialog.focus();
}

async function loadRecords() {
  if (!client) {
    setStatus(
      'Add the new Supabase connection in config.js to begin collecting records.',
    );
    renderEmpty();
    return;
  }

  setStatus('Loading shared records…');
  const { data, error } = await client
    .from('structured_guestbook_posts')
    .select(
      'id,name,relationship,answer_one,answer_two,answer_three,media_path,created_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    setStatus('Could not load records. Check the new Supabase setup.', true);
    return;
  }

  if (!data.length) {
    setStatus('');
    updateRecordCount(0);
    renderEmpty();
    return;
  }

  data.forEach((post) => {
    if (post.media_path) {
      post.media_url = client.storage
        .from('structured-moments')
        .getPublicUrl(post.media_path).data.publicUrl;
    }
    recordGrid.append(createRecord(post));
  });
  updateRecordCount(data.length);
  setStatus('');
}

async function uploadPhoto(file) {
  if (file.size > maxFileBytes) {
    throw new Error('Photo files must be smaller than 25MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const extension =
    file.name
      .split('.')
      .pop()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `public/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from('structured-moments')
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
  return path;
}

openForm.addEventListener('click', () => {
  if (!client) {
    setStatus(
      'Add the new Supabase connection in config.js before opening the form.',
      true,
    );
    return;
  }
  postDialog.showModal();
});

closeForm.addEventListener('click', () => postDialog.close());
closeWelcome?.addEventListener('click', () => welcomeDialog.close());
closeOnBackdropClick(postDialog);
closeOnBackdropClick(welcomeDialog);

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) return;

  const name = postForm.elements.name.value.trim();
  const email = postForm.elements.email.value.trim().toLowerCase();
  const relationship = postForm.elements.relationship.value;
  const answerOne = postForm.elements.answerOne.value.trim();
  const answerTwo = postForm.elements.answerTwo.value.trim();
  const answerThree = postForm.elements.answerThree.value.trim();
  const image = postForm.elements.image.files[0];
  if (!name || !relationship || !answerOne || !answerTwo || !answerThree)
    return;

  submitPost.disabled = true;
  submitPost.textContent = 'SAVING…';

  try {
    const mediaPath = image ? await uploadPhoto(image) : null;
    const { data, error } = await client
      .from('structured_guestbook_posts')
      .insert({
        name,
        relationship,
        answer_one: answerOne,
        answer_two: answerTwo,
        answer_three: answerThree,
        media_path: mediaPath,
      })
      .select(
        'id,name,relationship,answer_one,answer_two,answer_three,media_path,created_at',
      )
      .single();

    if (error) throw error;
    if (email) {
      const { error: contactError } = await client
        .from('structured_guestbook_contacts')
        .insert({
          post_id: data.id,
          email,
        });

      if (contactError) throw contactError;
    }
    if (data.media_path) {
      data.media_url = client.storage
        .from('structured-moments')
        .getPublicUrl(data.media_path).data.publicUrl;
    }

    recordGrid.querySelector('.empty')?.remove();
    recordGrid.prepend(createRecord(data));
    updateRecordCount(recordGrid.querySelectorAll('.record').length);
    postForm.reset();
    postDialog.close();
    setStatus('Your note has been added.');
  } catch (error) {
    setStatus(
      error.message || 'The note could not be posted. Please try again.',
      true,
    );
  } finally {
    submitPost.disabled = false;
    submitPost.textContent = 'POST YOUR NOTE →';
  }
});

showWelcome();
loadRecords();
