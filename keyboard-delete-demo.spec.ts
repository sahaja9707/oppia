// Local browser evidence harness. This file is not part of the upstream patch.
// @ts-nocheck
import {CommonModule} from '@angular/common';
import {EventEmitter, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {StateGraphVisualization} from './state-graph-visualization.component';
import {StateGraphLayoutService} from 'components/graph-services/graph-layout.service';
import {ExplorationStatesService} from 'pages/exploration-editor-page/services/exploration-states.service';
import {ExplorationWarningsService} from 'pages/exploration-editor-page/services/exploration-warnings.service';
import {GraphDataService} from 'pages/exploration-editor-page/services/graph-data.service';
import {RouterService} from 'pages/exploration-editor-page/services/router.service';
import {TranslationStatusService} from 'pages/exploration-editor-page/translation-tab/services/translation-status.service';
import {WindowDimensionsService} from 'services/contextual/window-dimensions.service';
import {StateCardIsCheckpointService} from 'components/state-editor/state-editor-properties-services/state-card-is-checkpoint.service';
import {TruncatePipe} from 'filters/string-utility-filters/truncate.pipe';

const templates = {before: "<!-- NOTE TO DEVELOPERS: The svg defs needed for this directive are\nincluded at the bottom of exploration-editor-page.component.html. In order for\nthe elements to render properly in Firefox, there cannot be multiple defs\nwith the same id on the page. -->\n<div [ngStyle]=\"{'height': getGraphHeightInPixels()}\">\n  <button *ngIf=\"maximize\"\n          (click)=\"sendOnMaximizeFunction()\"\n          class=\"btn btn-secondary btn-sm oppia-graph-resize-button\">\n    <i title=\"Expand Map\" class=\"fas fa-expand-arrows-alt oppia-material-icons\"></i>\n  </button>\n\n  <svg class=\"oppia-graph-viz\" width=\"100%\" height=\"100%\">\n    <g>\n      <rect #MainScreen id=\"pannableRect\" class=\"pannable-rect\" *ngIf=\"allowPanning\"\n            [attr.width]=\"'100%'\" [attr.height]=\"'100%'\">\n      </rect>\n      <g>\n        <g [attr.transform]=\"overallTransformStr\" width=\"100%\" height=\"100%\">\n          <g class=\"pannable-child\" [attr.transform]=\"innerTransformStr\">\n            <g class=\"widthLocation\" *ngFor=\"let link of augmentedLinks\">\n              <path class=\"link e2e-test-link\" *ngIf=\"link.d && !link.connectsDestIfStuck\" [attr.d]=\"link.d\" marker-end=\"url(#arrowhead)\" [attr.style]=\"link.style\">\n              </path>\n              <path class=\"link e2e-test-link\" *ngIf=\"link.d && link.connectsDestIfStuck\" [attr.d]=\"link.d\" marker-end=\"url(#arrowhead)\" [attr.style]=\"link.style\" stroke-dasharray=\"3,4\">\n              </path>\n            </g>\n\n            <g class=\"node e2e-test-node\" *ngFor=\"let node of nodeList\">\n              <rect [attr.rx]=\"2\" [attr.ry]=\"2\" [attr.height]=\"node.height\" [attr.width]=\"node.width\"\n                    class=\"e2e-test-node-background {{node.nodeClass}}\"\n                    [attr.x]=\"node.x0\" [attr.y]=\"node.y0\"\n                    [ngClass]=\"{'clickable': canNavigateToNode(node.id)}\"\n                    [attr.style]=\"node.style\"\n                    tabindex=\"0\"\n                    (keydown.enter)=\"sendOnClickFunctionData(node.id)\"\n                    (click)=\"sendOnClickFunctionData(node.id)\"\n                    role=\"button\"\n                    [attr.aria-label]=\"'Switch to ' + getNodeTitle(node) + 'Card'\">\n              </rect>\n              <title>{{getNodeTitle(node)}}</title>\n              <text text-anchor=\"middle\" [attr.x]=\"node.xLabel\" [attr.y]=\"node.yLabel\">\n                <tspan *ngIf=\"isCheckpoint(node.id)\" alignment-baseline=\"central\">&#11088;</tspan>\n                <tspan class=\"e2e-test-node-label\">\n                  <tspan alignment-baseline=\"central\">{{getTruncatedLabel(node.label) + ' '}}</tspan>\n                  <tspan [attr.x]=\"node.xLabel\" dy=\"1em\" class=\"oppia-box-fill\">{{getTruncatedLabel(node.secondaryLabel)}}</tspan>\n                </tspan>\n              </text>\n              <g *ngIf=\"getNodeErrorMessage(node.label) && (showWarningSign || showTranslationWarnings)\"\n                 ngbTooltip=\"{{getNodeErrorMessage(node.label)}}\"\n                 placement=\"top\">\n                <rect (click)=\"sendOnClickFunctionData(node.id)\" class=\"oppia-graph-warning-message clickable oppia-error-message-fill e2e-test-node-warning-sign\"\n                      role=\"alertdialog\"\n                      width=\"22\" height=\"22\"\n                      [attr.x]=\"node.x0\" [attr.y]=\"node.y0 - 8\"\n                      [attr.transform]=\"getHighlightTransform(node.x0, node.y0)\"\n                      [attr.style]=\"'fill: yellow; z-index: 10000;'\"\n                      [attr.aria-label]=\"getNodeErrorMessage(node.label)\">\n                </rect>\n                <text fill=\"firebrick\" text-anchor=\"middle\" [attr.x]=\"node.x0 + 11\"\n                      [attr.y]=\"node.y0 + 9\"\n                      class=\"oppia-highlight-text\"\n                      [attr.transform]=\"getHighlightTextTransform(node.x0, node.y0)\">\n                  \u26a0\n                </text>\n              </g>\n              <g *ngIf=\"isEditable && node.canDelete\" class=\"e2e-test-delete-node\">\n                <rect height=\"15\" width=\"15\" opacity=\"0\" stroke-width=\"0\"\n                      [attr.x]=\"node.x0 + node.width\" [attr.y]=\"node.y0\"\n                      transform=\"translate(0, -15)\"\n                      class=\"clickable oppia-node-delete\"\n                      (click)=\"onNodeDeletionClick(node.id)\">\n                </rect>\n                <text [attr.aria-label]=\"'Delete ' + getNodeTitle(node) + ' card'\" (keydown.enter)=\"onNodeDeletionClick(node.id)\"\n                      tabindex=\"0\" [attr.dx]=\"node.x0 + node.width\" [attr.dy]=\"node.y0\" text-anchor=\"right\">\n                  x\n                </text>\n              </g>\n            </g>\n          </g>\n\n          <g *ngIf=\"opacityMap\">\n            <rect width=\"210\" height=\"70\" [attr.x]=\"GRAPH_WIDTH - 250\" y=\"10\" class=\"oppia-rectangle\">\n            </rect>\n\n            <rect width=\"190\" height=\"20\" [attr.x]=\"GRAPH_WIDTH - 240\" y=\"20\"\n                  class=\"legend-bar\">\n            </rect>\n\n            <text [attr.x]=\"GRAPH_WIDTH - 200\" y=\"60\">\n              {{ opacityMap.legend }}\n            </text>\n          </g>\n        </g>\n      </g>\n    </g>\n  </svg>\n</div>\n", after: "<!-- NOTE TO DEVELOPERS: The svg defs needed for this directive are\nincluded at the bottom of exploration-editor-page.component.html. In order for\nthe elements to render properly in Firefox, there cannot be multiple defs\nwith the same id on the page. -->\n<div [ngStyle]=\"{'height': getGraphHeightInPixels()}\">\n  <button *ngIf=\"maximize\"\n          (click)=\"sendOnMaximizeFunction()\"\n          class=\"btn btn-secondary btn-sm oppia-graph-resize-button\">\n    <i title=\"Expand Map\" class=\"fas fa-expand-arrows-alt oppia-material-icons\"></i>\n  </button>\n\n  <svg class=\"oppia-graph-viz\" width=\"100%\" height=\"100%\">\n    <g>\n      <rect #MainScreen id=\"pannableRect\" class=\"pannable-rect\" *ngIf=\"allowPanning\"\n            [attr.width]=\"'100%'\" [attr.height]=\"'100%'\">\n      </rect>\n      <g>\n        <g [attr.transform]=\"overallTransformStr\" width=\"100%\" height=\"100%\">\n          <g class=\"pannable-child\" [attr.transform]=\"innerTransformStr\">\n            <g class=\"widthLocation\" *ngFor=\"let link of augmentedLinks\">\n              <path class=\"link e2e-test-link\" *ngIf=\"link.d && !link.connectsDestIfStuck\" [attr.d]=\"link.d\" marker-end=\"url(#arrowhead)\" [attr.style]=\"link.style\">\n              </path>\n              <path class=\"link e2e-test-link\" *ngIf=\"link.d && link.connectsDestIfStuck\" [attr.d]=\"link.d\" marker-end=\"url(#arrowhead)\" [attr.style]=\"link.style\" stroke-dasharray=\"3,4\">\n              </path>\n            </g>\n\n            <g class=\"node e2e-test-node\" *ngFor=\"let node of nodeList\">\n              <rect [attr.rx]=\"2\" [attr.ry]=\"2\" [attr.height]=\"node.height\" [attr.width]=\"node.width\"\n                    class=\"e2e-test-node-background {{node.nodeClass}}\"\n                    [attr.x]=\"node.x0\" [attr.y]=\"node.y0\"\n                    [ngClass]=\"{'clickable': canNavigateToNode(node.id)}\"\n                    [attr.style]=\"node.style\"\n                    tabindex=\"0\"\n                    (keydown.enter)=\"sendOnClickFunctionData(node.id)\"\n                    (click)=\"sendOnClickFunctionData(node.id)\"\n                    role=\"button\"\n                    [attr.aria-label]=\"'Switch to ' + getNodeTitle(node) + 'Card'\">\n              </rect>\n              <title>{{getNodeTitle(node)}}</title>\n              <text text-anchor=\"middle\" [attr.x]=\"node.xLabel\" [attr.y]=\"node.yLabel\">\n                <tspan *ngIf=\"isCheckpoint(node.id)\" alignment-baseline=\"central\">&#11088;</tspan>\n                <tspan class=\"e2e-test-node-label\">\n                  <tspan alignment-baseline=\"central\">{{getTruncatedLabel(node.label) + ' '}}</tspan>\n                  <tspan [attr.x]=\"node.xLabel\" dy=\"1em\" class=\"oppia-box-fill\">{{getTruncatedLabel(node.secondaryLabel)}}</tspan>\n                </tspan>\n              </text>\n              <g *ngIf=\"getNodeErrorMessage(node.label) && (showWarningSign || showTranslationWarnings)\"\n                 ngbTooltip=\"{{getNodeErrorMessage(node.label)}}\"\n                 placement=\"top\">\n                <rect (click)=\"sendOnClickFunctionData(node.id)\" class=\"oppia-graph-warning-message clickable oppia-error-message-fill e2e-test-node-warning-sign\"\n                      role=\"alertdialog\"\n                      width=\"22\" height=\"22\"\n                      [attr.x]=\"node.x0\" [attr.y]=\"node.y0 - 8\"\n                      [attr.transform]=\"getHighlightTransform(node.x0, node.y0)\"\n                      [attr.style]=\"'fill: yellow; z-index: 10000;'\"\n                      [attr.aria-label]=\"getNodeErrorMessage(node.label)\">\n                </rect>\n                <text fill=\"firebrick\" text-anchor=\"middle\" [attr.x]=\"node.x0 + 11\"\n                      [attr.y]=\"node.y0 + 9\"\n                      class=\"oppia-highlight-text\"\n                      [attr.transform]=\"getHighlightTextTransform(node.x0, node.y0)\">\n                  \u26a0\n                </text>\n              </g>\n              <g *ngIf=\"isEditable && node.canDelete\"\n                 class=\"e2e-test-delete-node\"\n                 role=\"button\"\n                 tabindex=\"0\"\n                 [attr.aria-label]=\"'Delete ' + getNodeTitle(node) + ' card'\"\n                 (keydown.enter)=\"onNodeDeletionClick(node.id)\"\n                 (keydown.space)=\"$event.preventDefault()\"\n                 (keyup.space)=\"onNodeDeletionClick(node.id)\"\n                 (click)=\"onNodeDeletionClick(node.id)\">\n                <rect height=\"15\" width=\"15\" opacity=\"0\" stroke-width=\"0\"\n                      [attr.x]=\"node.x0 + node.width\" [attr.y]=\"node.y0\"\n                      transform=\"translate(0, -15)\"\n                      class=\"clickable oppia-node-delete\">\n                </rect>\n                <text [attr.dx]=\"node.x0 + node.width\" [attr.dy]=\"node.y0\" text-anchor=\"right\">\n                  x\n                </text>\n              </g>\n            </g>\n          </g>\n\n          <g *ngIf=\"opacityMap\">\n            <rect width=\"210\" height=\"70\" [attr.x]=\"GRAPH_WIDTH - 250\" y=\"10\" class=\"oppia-rectangle\">\n            </rect>\n\n            <rect width=\"190\" height=\"20\" [attr.x]=\"GRAPH_WIDTH - 240\" y=\"20\"\n                  class=\"legend-bar\">\n            </rect>\n\n            <text [attr.x]=\"GRAPH_WIDTH - 200\" y=\"60\">\n              {{ opacityMap.legend }}\n            </text>\n          </g>\n        </g>\n      </g>\n    </g>\n  </svg>\n</div>\n"};
const graphData = {
  nodes: {Introduction: 'Introduction', Review: 'Review'},
  links: [], initStateId: 'Introduction', finalStateIds: [],
};
function layout() {
  const result = {};
  ['Introduction', 'Review'].forEach((id, index) => {
    const x = 80 + index * 280;
    result[id] = {id, label: id, depth: index, offset: 0,
      reachable: true, reachableFromEnd: true, x0: x, y0: 110,
      xLabel: x + 80, yLabel: 135, width: 160, height: 50};
  });
  return result;
}

describe('Delete-card component browser evidence', () => {
  let fixture;
  afterEach(() => {
    fixture.destroy();
    document.getElementById('demo-shell')?.remove();
    delete document.body.dataset.demoReady;
  });
  ['before', 'after'].forEach(variant => {
    it('should demonstrate real component activation ' + variant, done => {
      TestBed.configureTestingModule({
        imports: [CommonModule],
        declarations: [StateGraphVisualization],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          {provide: ExplorationStatesService, useValue: {getState: () => null}},
          {provide: ExplorationWarningsService, useValue: {getAllStateRelatedWarnings: () => ({})}},
          {provide: TranslationStatusService, useValue: {getAllStatesNeedUpdatewarning: () => ({})}},
          {provide: GraphDataService, useValue: {getGraphData: () => graphData, updateGraphData: new EventEmitter()}},
          {provide: RouterService, useValue: {onCenterGraph: new EventEmitter()}},
          {provide: WindowDimensionsService, useValue: {getResizeEvent: () => new EventEmitter()}},
          {provide: StateCardIsCheckpointService, useValue: {}},
          {provide: TruncatePipe, useValue: {transform: value => value || ''}},
          {provide: StateGraphLayoutService, useValue: {
            computeLayout: layout, getGraphWidth: () => 640, getGraphHeight: () => 280,
            modifyPositionValues: nodes => nodes,
            getGraphBoundaries: () => ({left: 80, right: 520, top: 110, bottom: 160}),
            getAugmentedLinks: () => [],
          }},
        ],
      }).overrideComponent(StateGraphVisualization, {
        set: {template: templates[variant]},
      }).compileComponents().then(() => {
        fixture = TestBed.createComponent(StateGraphVisualization);
        const component = fixture.componentInstance;
        component.isEditable = true;
        component.currentStateId = 'Introduction';
        component.allowPanning = false;
        component.centerAtCurrentState = false;
        component.showWarningSign = false;
        component.showTranslationWarnings = false;
        const shell = document.createElement('main');
        shell.id = 'demo-shell';
        shell.style.cssText = 'max-width:800px;margin:24px auto;font:16px Arial;color:#172a3a;';
        const title = document.createElement('h1');
        title.textContent = 'Exploration Overview — ' + variant;
        shell.appendChild(title);
        const description = document.createElement('p');
        description.textContent = 'Isolated real Angular component, using the repository template and deletion handler. No backend or editor workflow is simulated.';
        shell.appendChild(description);
        const status = document.createElement('p');
        status.id = 'step';
        status.style.cssText = 'padding:16px;background:#eef4fa;border-radius:8px;font-weight:bold;';
        status.textContent = 'Waiting for keyboard input';
        shell.appendChild(status);
        fixture.nativeElement.style.cssText = 'display:block;position:relative;width:640px;height:280px;border:1px solid #bac8d5;background:#fff;';
        shell.appendChild(fixture.nativeElement);
        const output = document.createElement('pre');
        output.id = 'output';
        output.style.cssText = 'padding:16px;background:#f4f6f8;font:16px monospace;line-height:1.7;';
        output.textContent = 'Delete actions emitted: 0\nFocus role: not inspected\nBrowser errors captured: 0';
        shell.appendChild(output);
        const events = document.createElement('p');
        events.id = 'events';
        events.textContent = 'No deletion action emitted yet.';
        shell.appendChild(events);
        document.body.appendChild(shell);
        document.body.style.cssText = 'margin:0;background:#fafcfe;';
        let count = 0;
        const subscription = component.onDeleteFunction.subscribe(id => {
          count++;
          shell.dataset.count = String(count);
          events.textContent = 'Latest actual onDeleteFunction output: ' + id;
        });
        shell.dataset.count = '0';
        fixture.detectChanges();
        document.body.dataset.demoReady = variant;
        window.addEventListener('demo-finish', () => {
          subscription.unsubscribe();
          done();
        }, {once: true});
      }).catch(done.fail);
    }, 180000);
  });
});
