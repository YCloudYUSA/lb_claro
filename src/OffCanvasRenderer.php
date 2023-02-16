<?php

namespace Drupal\lb_claro;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Controller\TitleResolverInterface;
use Drupal\Core\Render\MainContent\OffCanvasRenderer as BaseOffCanvasRenderer;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Symfony\Component\HttpFoundation\Request;

/**
 * Defines a custom off canvas renderer.
 */
class OffCanvasRenderer extends BaseOffCanvasRenderer {

  /**
   * Constructs a new OffCanvasRenderer.
   *
   * @param \Drupal\Core\Controller\TitleResolverInterface $title_resolver
   *   The title resolver.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer.
   * @param string $position
   *   (optional) The position to render the off-canvas dialog.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $configFactory
   *   Config factory.
   */
  public function __construct(
    TitleResolverInterface $title_resolver,
    RendererInterface $renderer,
    $position,
    protected ConfigFactoryInterface $configFactory,
  ) {
    parent::__construct($title_resolver, $renderer, $position);
  }

  /**
   * {@inheritdoc}
   */
  public function renderResponse(array $main_content, Request $request, RouteMatchInterface $route_match) {
    $response = parent::renderResponse($main_content, $request, $route_match);
    $commands = &$response->getCommands();
    if (isset($commands[0]['dialogOptions']['width'])) {
      $commands[0]['dialogOptions']['width'] = $this->configFactory->get('lb_claro.settings')->get('off_canvas_initial_width');
    }
    return $response;
  }

}
