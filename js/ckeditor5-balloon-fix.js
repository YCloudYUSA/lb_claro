/**
 * @file
 * Fix CKEditor 5 balloon positioning in Layout Builder dialogs.
 *
 * The balloon position calculation fails in dialog context, positioning it at -99999px.
 * This script polls for off-screen balloons and corrects their position.
 */

(function (Drupal) {
  'use strict';

  // Start polling immediately when script loads
  setInterval(function () {
    // Only run in dialog context
    if (!document.querySelector('.ui-dialog')) {
      return;
    }

    const panels = document.querySelectorAll('.ck-balloon-panel_visible');
    panels.forEach(function (panel) {
      // Skip the powered-by balloon
      if (panel.classList.contains('ck-powered-by-balloon')) {
        return;
      }

      if (panel.style.top === '-99999px' || panel.style.left === '-99999px') {
        // Find the dialog to position relative to it
        const dialog = document.querySelector('.ui-dialog');
        if (dialog) {
          const dialogRect = dialog.getBoundingClientRect();

          // Try to get selection position for better placement
          const editable = document.querySelector('.ck-editor__editable');
          let top = dialogRect.top + 150;
          let left = dialogRect.left + 50;

          if (editable && editable.ckeditorInstance) {
            try {
              const editor = editable.ckeditorInstance;
              const selection = editor.model.document.selection;
              const range = selection.getFirstRange();
              if (range) {
                const viewRange = editor.editing.mapper.toViewRange(range);
                const domRange = editor.editing.view.domConverter.viewRangeToDom(viewRange);
                const rect = domRange.getBoundingClientRect();
                top = rect.bottom + 10;
                left = rect.left;
              }
            } catch (e) {
              // Use fallback position
            }
          }

          // Keep within viewport
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          if (left + 350 > viewportWidth) left = viewportWidth - 370;
          if (left < 10) left = 10;
          if (top + 250 > viewportHeight) top = viewportHeight - 270;
          if (top < 10) top = 10;

          panel.style.position = 'fixed';
          panel.style.top = top + 'px';
          panel.style.left = left + 'px';
          panel.style.zIndex = '10000';
        }
      }
    });
  }, 50);

})(Drupal);
