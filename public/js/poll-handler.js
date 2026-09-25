document.addEventListener('DOMContentLoaded', function () {
  const addOptionBtn = document.getElementById('add-option');
  const pollOptions = document.getElementById('poll-options');
  let optionCount = 2;

  if (addOptionBtn) {
    addOptionBtn.addEventListener('click', function () {
      optionCount++;
      if (optionCount <= 10) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'poll_options[]';
        input.placeholder = `Option ${optionCount}`;
        input.style.width = '90%';
        input.style.marginBottom = '5px';
        pollOptions.appendChild(input);
      }

      if (optionCount >= 10) {
        addOptionBtn.style.display = 'none';
      }
    });
  }

  document.querySelectorAll('.poll-container').forEach((container) => {
    const voteButton = container.querySelector('.vote-button');
    if (voteButton) {
      voteButton.addEventListener('click', async function () {
        const pollId = container.dataset.pollId;
        const options = container.querySelectorAll('input[type="radio"]');
        const selectedIndexes = [];

        options.forEach((opt, index) => {
          if (opt.checked) {
            selectedIndexes.push(index);
          }
        });

        if (selectedIndexes.length !== 1) {
          alert('Please select an option');
          return;
        }

        try {
          const response = await fetch('/api/poll/vote', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pollId,
              optionIndexes: selectedIndexes
            })
          });

          const data = await response.json();
          if (data.success) {
            location.reload(); // Refresh to show updated results
          } else {
            alert(data.error || 'Vote failed');
          }
        } catch (error) {
          console.error('Vote error:', error);
          alert('Error submitting vote');
        }
      });
    }
  });

});
