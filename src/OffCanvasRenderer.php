<?php

namespace Drupal\lb_claro;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\OpenOffCanvasDialogCommand;
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
   * Config factory.
   *
   * @var \Drupal\Core\Config\ConfigFactoryInterface
   */
  private $configFactory;

  /**
   * Constructs a new OffCanvasRenderer.
   *
   * @param \Drupal\Core\Controller\TitleResolverInterface $title_resolver
   *   The title resolver.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer.
   * @param string $position
   *   (optional) The position to render the off-canvas dialog.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   Config factory.
   */
  public function __construct(TitleResolverInterface $title_resolver, RendererInterface $renderer, $position, ConfigFactoryInterface $config_factory) {
    parent::__construct($title_resolver, $renderer, $position);
    $this->configFactory = $config_factory;
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
